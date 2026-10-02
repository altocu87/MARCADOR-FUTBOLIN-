/**
 * Servicio de progresión: recalcula ELO, XP, niveles y logros reprocesando
 * el historial en orden cronológico. No hay totales guardados sin origen:
 * todo se deriva de partidos válidos, por lo que reprocesar no duplica premios.
 */
import type { Team } from '../../match-engine';
import type { ProgressionSettings, StoredMatch } from '../persistence';
import { comebackSize, sortMatches } from '../statistics/statistics';
import { ACHIEVEMENTS, RARITY_XP } from './achievements';
import {
  ELO_MODES,
  PROGRESSION_RULES_VERSION,
  XP_TABLE,
  categoryFor,
  eloExpected,
  goalDiffMultiplier,
  levelForXp,
  type CategoryDef,
} from './rules';

export interface UnlockedAchievement {
  id: string;
  matchId: string;
  at: number;
}

export interface PlayerProgress {
  playerId: string;
  elo: number;
  maxElo: number;
  rankedPlayed: number;
  xp: number;
  level: number;
  category: CategoryDef;
  achievements: UnlockedAchievement[];
  eloHistory: { matchId: string; at: number; elo: number }[];
}

export interface XpLine {
  label: string;
  xp: number;
}

export interface MatchProgressEntry {
  playerId: string;
  eloBefore?: number;
  eloAfter?: number;
  eloDelta?: number;
  k?: number;
  xpGained: number;
  xpBreakdown: XpLine[];
  levelBefore: number;
  levelAfter: number;
  unlocked: string[];
}

export interface ProgressionSnapshot {
  rulesVersion: string;
  players: Map<string, PlayerProgress>;
  byMatch: Map<string, Map<string, MatchProgressEntry>>;
}

interface Counters {
  played: number;
  wins: number;
  winStreak: number;
}

export function computeProgression(
  playerIds: string[],
  matches: StoredMatch[],
  settings: ProgressionSettings,
): ProgressionSnapshot {
  const players = new Map<string, PlayerProgress>();
  const counters = new Map<string, Counters>();
  const byMatch = new Map<string, Map<string, MatchProgressEntry>>();

  const ensure = (id: string): PlayerProgress => {
    let p = players.get(id);
    if (!p) {
      p = {
        playerId: id,
        elo: settings.eloInitial,
        maxElo: settings.eloInitial,
        rankedPlayed: 0,
        xp: 0,
        level: 0,
        category: categoryFor(settings.eloInitial),
        achievements: [],
        eloHistory: [],
      };
      players.set(id, p);
      counters.set(id, { played: 0, wins: 0, winStreak: 0 });
    }
    return p;
  };
  playerIds.forEach(ensure);

  for (const match of sortMatches(matches)) {
    const entries = new Map<string, MatchProgressEntry>();
    const isRanked = ELO_MODES.includes(match.config.mode);
    const winner = match.result.winner;
    const comeback = comebackSize(match);

    // ELO: media de cada equipo calculada con los valores previos al partido.
    const teamAvg = (team: Team) => {
      const ids = match.participants.filter((p) => p.team === team).map((p) => p.playerId);
      return ids.reduce((sum, id) => sum + ensure(id).elo, 0) / ids.length;
    };
    const avg = { white: teamAvg('white'), blue: teamAvg('blue') };
    const diff = match.result.score.white - match.result.score.blue;
    // Partido decidido por penaltis: diferencia ordinaria 0 → multiplicador 1,00 (propuesta).
    const mult = settings.goalDiffMultiplier ? goalDiffMultiplier(diff) : 1;

    const eloChanges = new Map<string, { before: number; after: number; delta: number; k: number }>();
    if (isRanked) {
      for (const part of match.participants) {
        const p = ensure(part.playerId);
        const opp: Team = part.team === 'white' ? 'blue' : 'white';
        const expected = eloExpected(avg[part.team], avg[opp]);
        const s = part.team === winner ? 1 : 0;
        const k = p.rankedPlayed < settings.provisionalMatches ? settings.kProvisional : settings.kEstablished;
        const delta = Math.round(k * mult * (s - expected));
        eloChanges.set(part.playerId, { before: p.elo, after: p.elo + delta, delta, k });
      }
    }

    for (const part of match.participants) {
      const p = ensure(part.playerId);
      const c = counters.get(part.playerId)!;
      const won = part.team === winner;
      const opp: Team = part.team === 'white' ? 'blue' : 'white';
      const levelBefore = p.level;

      c.played += 1;
      if (won) {
        c.wins += 1;
        c.winStreak += 1;
      } else c.winStreak = 0;

      const change = eloChanges.get(part.playerId);
      if (change) {
        p.elo = change.after;
        p.maxElo = Math.max(p.maxElo, p.elo);
        p.rankedPlayed += 1;
        p.category = categoryFor(p.elo);
        p.eloHistory.push({ matchId: match.id, at: match.finishedAt, elo: p.elo });
      }

      const lines: XpLine[] = [{ label: 'Partido completado', xp: XP_TABLE.complete }];
      lines.push(won ? { label: 'Victoria', xp: XP_TABLE.win } : { label: 'Derrota', xp: XP_TABLE.loss });
      if (won && isRanked) lines.push({ label: 'Victoria clasificatoria', xp: XP_TABLE.rankedWinBonus });
      if (won && match.result.reason === 'golden_goal') lines.push({ label: 'Victoria en prórroga', xp: XP_TABLE.overtimeWin });
      if (won && match.result.reason === 'penalties') lines.push({ label: 'Victoria en penaltis', xp: XP_TABLE.penaltiesWin });

      const baseXp = lines.reduce((s, l) => s + l.xp, 0);
      const ctxLevel = levelForXp(p.xp + baseXp);
      const got = new Set(p.achievements.map((a) => a.id));
      const unlocked: string[] = [];
      for (const a of ACHIEVEMENTS) {
        if (got.has(a.id)) continue;
        const ok = a.check({
          match,
          won,
          goalsFor: match.result.score[part.team],
          goalsAgainst: match.result.score[opp],
          played: c.played,
          wins: c.wins,
          winStreak: c.winStreak,
          rankedPlayed: p.rankedPlayed,
          elo: p.elo,
          level: ctxLevel,
          comeback,
        });
        if (ok) {
          unlocked.push(a.id);
          p.achievements.push({ id: a.id, matchId: match.id, at: match.finishedAt });
          lines.push({ label: `Logro: ${a.name}`, xp: RARITY_XP[a.rarity] });
        }
      }

      const xpGained = lines.reduce((s, l) => s + l.xp, 0);
      p.xp += xpGained;
      p.level = levelForXp(p.xp);

      entries.set(part.playerId, {
        playerId: part.playerId,
        eloBefore: change?.before,
        eloAfter: change?.after,
        eloDelta: change?.delta,
        k: change?.k,
        xpGained,
        xpBreakdown: lines,
        levelBefore,
        levelAfter: p.level,
        unlocked,
      });
    }
    byMatch.set(match.id, entries);
  }

  return { rulesVersion: PROGRESSION_RULES_VERSION, players, byMatch };
}
