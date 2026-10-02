/**
 * Torneos (propuesta «torneos-1», pendiente de aprobación):
 * - Liguilla: todos contra todos a una vuelta, 3 a 8 equipos. Victoria 3 puntos.
 *   Desempate: puntos → diferencia de goles → goles a favor → enfrentamiento directo → nombre.
 * - Cuadro: eliminación directa para 3 a 8 equipos; los huecos dan pase directo.
 *   Siembra por ELO (1 contra el último) o aleatoria.
 * Equipos de 1 o 2 jugadores. Ganar el torneo concede XP una sola vez.
 */
import type { MatchConfig, ParticipantRef, Team } from '../../match-engine';
import { newId } from '../ids';
import {
  STORAGE_FORMAT_VERSION,
  type Fixture,
  type Player,
  type StoredMatch,
  type Tournament,
  type TournamentFormat,
  type TournamentTeam,
} from '../persistence';

export const TOURNAMENT_RULES_VERSION = 'torneos-1';
export const MIN_TEAMS = 3;
export const MAX_TEAMS = 8;

export interface TournamentDraft {
  name: string;
  format: TournamentFormat;
  teamSize: 1 | 2;
  ranked: boolean;
  config: MatchConfig;
  teams: { playerIds: string[] }[];
  seeding: 'elo' | 'random';
}

export function validateDraft(d: TournamentDraft): string[] {
  const errors: string[] = [];
  if (!d.name.trim()) errors.push('Ponle un nombre al torneo.');
  if (d.teams.length < MIN_TEAMS || d.teams.length > MAX_TEAMS) errors.push(`Entre ${MIN_TEAMS} y ${MAX_TEAMS} equipos.`);
  const all = d.teams.flatMap((t) => t.playerIds);
  if (new Set(all).size !== all.length) errors.push('Un jugador no puede estar en dos equipos.');
  if (d.teams.some((t) => t.playerIds.length !== d.teamSize)) errors.push(`Cada equipo necesita ${d.teamSize} jugador(es).`);
  return errors;
}

export function teamName(playerIds: string[], players: Player[]): string {
  return playerIds.map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' + ');
}

/** Emparejamientos a una vuelta por el método del círculo. */
export function roundRobin(teamIds: string[]): Fixture[] {
  const ids: (string | null)[] = [...teamIds];
  if (ids.length % 2 === 1) ids.push(null);
  const n = ids.length;
  const fixtures: Fixture[] = [];
  for (let r = 0; r < n - 1; r += 1) {
    for (let i = 0; i < n / 2; i += 1) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      if (a && b) {
        // Alternar lados para repartir Blanco/Azul.
        const [w, bl] = (r + i) % 2 === 0 ? [a, b] : [b, a];
        fixtures.push({ id: newId('fx'), round: r + 1, whiteTeamId: w, blueTeamId: bl });
      }
    }
    ids.splice(1, 0, ids.pop()!);
  }
  return fixtures;
}

/** Orden de siembra estándar para un cuadro de tamaño `size` (1-8, 4-5, 2-7, 3-6…). */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next = order.length * 2 + 1;
    order = order.flatMap((s) => [s, next - s]);
  }
  return order;
}

/** Cuadro de eliminación con pases directos para completar potencia de 2. */
export function buildBracket(seededTeamIds: string[]): Fixture[] {
  const size = seededTeamIds.length <= 4 ? 4 : 8;
  const order = seedOrder(size);
  const rounds = Math.log2(size);
  const fixtures: Fixture[][] = [];
  for (let r = 1; r <= rounds; r += 1) {
    const count = size / 2 ** r;
    fixtures.push(Array.from({ length: count }, () => ({ id: newId('fx'), round: r, whiteTeamId: null, blueTeamId: null })));
  }
  for (let r = 0; r < rounds - 1; r += 1) {
    fixtures[r].forEach((f, i) => {
      f.nextFixtureId = fixtures[r + 1][Math.floor(i / 2)].id;
      f.nextSlot = i % 2 === 0 ? 'white' : 'blue';
    });
  }
  fixtures[0].forEach((f, i) => {
    f.whiteTeamId = seededTeamIds[order[i * 2] - 1] ?? null;
    f.blueTeamId = seededTeamIds[order[i * 2 + 1] - 1] ?? null;
  });
  const flat = fixtures.flat();
  // Pases directos de la primera ronda.
  for (const f of fixtures[0]) {
    if (f.whiteTeamId && !f.blueTeamId) advanceWinner(flat, f, f.whiteTeamId, true);
    else if (!f.whiteTeamId && f.blueTeamId) advanceWinner(flat, f, f.blueTeamId, true);
  }
  return flat;
}

function advanceWinner(fixtures: Fixture[], f: Fixture, winnerTeamId: string, bye = false): void {
  f.winnerTeamId = winnerTeamId;
  if (bye) f.bye = true;
  const next = fixtures.find((x) => x.id === f.nextFixtureId);
  if (next && f.nextSlot) {
    if (f.nextSlot === 'white') next.whiteTeamId = winnerTeamId;
    else next.blueTeamId = winnerTeamId;
  }
}

export function createTournament(
  draft: TournamentDraft,
  players: Player[],
  eloOf: (id: string) => number,
  now: number,
  rnd: () => number = Math.random,
): Tournament {
  const errors = validateDraft(draft);
  if (errors.length) throw new Error(errors.join(' '));
  let teams: TournamentTeam[] = draft.teams.map((t) => ({
    id: newId('tt'),
    name: teamName(t.playerIds, players),
    playerIds: [...t.playerIds],
  }));
  if (draft.seeding === 'elo') {
    const avg = (t: TournamentTeam) => t.playerIds.reduce((s, id) => s + eloOf(id), 0) / t.playerIds.length;
    teams = [...teams].sort((a, b) => avg(b) - avg(a));
  } else {
    for (let i = teams.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }
  }
  const ids = teams.map((t) => t.id);
  return {
    formatVersion: STORAGE_FORMAT_VERSION,
    id: newId('t'),
    name: draft.name.trim(),
    format: draft.format,
    teamSize: draft.teamSize,
    ranked: draft.ranked,
    config: { ...draft.config, mode: draft.ranked ? 'ranked' : 'quick', testMode: false },
    teams,
    fixtures: draft.format === 'league' ? roundRobin(ids) : buildBracket(ids),
    status: 'active',
    createdAt: now,
  };
}

export function playableFixtures(t: Tournament): Fixture[] {
  if (t.status !== 'active') return [];
  return t.fixtures.filter((f) => f.whiteTeamId && f.blueTeamId && !f.winnerTeamId);
}

export function fixtureParticipants(t: Tournament, f: Fixture, players: Player[]): ParticipantRef[] {
  const out: ParticipantRef[] = [];
  for (const [team, tid] of [['white', f.whiteTeamId], ['blue', f.blueTeamId]] as [Team, string | null][]) {
    const tt = t.teams.find((x) => x.id === tid);
    tt?.playerIds.forEach((pid, i) =>
      out.push({ playerId: pid, team, slot: (i + 1) as 1 | 2, nameSnapshot: players.find((p) => p.id === pid)?.name ?? '?' }),
    );
  }
  return out;
}

export interface StandingRow {
  team: TournamentTeam;
  played: number;
  wins: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
}

export function leagueStandings(t: Tournament, matches: StoredMatch[]): StandingRow[] {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const rows = new Map<string, StandingRow>(
    t.teams.map((team) => [team.id, { team, played: 0, wins: 0, losses: 0, points: 0, goalsFor: 0, goalsAgainst: 0, diff: 0 }]),
  );
  const h2h = new Map<string, string>(); // "a|b" → ganador
  for (const f of t.fixtures) {
    const m = f.matchId ? byId.get(f.matchId) : undefined;
    if (!m || !f.whiteTeamId || !f.blueTeamId || !f.winnerTeamId) continue;
    for (const [side, tid] of [['white', f.whiteTeamId], ['blue', f.blueTeamId]] as [Team, string][]) {
      const r = rows.get(tid)!;
      const opp: Team = side === 'white' ? 'blue' : 'white';
      r.played += 1;
      r.goalsFor += m.result.score[side];
      r.goalsAgainst += m.result.score[opp];
      r.diff = r.goalsFor - r.goalsAgainst;
      if (f.winnerTeamId === tid) {
        r.wins += 1;
        r.points += 3;
      } else r.losses += 1;
    }
    h2h.set([f.whiteTeamId, f.blueTeamId].sort().join('|'), f.winnerTeamId);
  }
  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const w = h2h.get([a.team.id, b.team.id].sort().join('|'));
    if (w === a.team.id) return -1;
    if (w === b.team.id) return 1;
    return a.team.name.localeCompare(b.team.name, 'es');
  });
}

/** Registra el resultado de un partido del torneo. Devuelve el torneo actualizado. */
export function recordFixtureResult(t: Tournament, fixtureId: string, match: StoredMatch, matches: StoredMatch[]): Tournament {
  const next: Tournament = { ...t, fixtures: t.fixtures.map((f) => ({ ...f })) };
  const f = next.fixtures.find((x) => x.id === fixtureId);
  if (!f || f.winnerTeamId || !f.whiteTeamId || !f.blueTeamId) return t;
  f.matchId = match.id;
  advanceWinner(next.fixtures, f, match.result.winner === 'white' ? f.whiteTeamId : f.blueTeamId);
  const allDone = next.fixtures.every((x) => x.winnerTeamId || (!x.whiteTeamId && !x.blueTeamId));
  if (next.format === 'bracket') {
    const final = next.fixtures.reduce((a, b) => (b.round > a.round ? b : a));
    if (final.winnerTeamId) {
      next.status = 'finished';
      next.winnerTeamId = final.winnerTeamId;
      next.finishedAt = match.finishedAt;
      next.finalMatchId = match.id;
    }
  } else if (allDone) {
    const standings = leagueStandings(next, [...matches.filter((m) => m.id !== match.id), match]);
    next.status = 'finished';
    next.winnerTeamId = standings[0].team.id;
    next.finishedAt = match.finishedAt;
    next.finalMatchId = match.id;
  }
  return next;
}

export function roundLabel(t: Tournament, round: number): string {
  if (t.format === 'league') return `Jornada ${round}`;
  const total = Math.max(...t.fixtures.map((f) => f.round));
  const fromEnd = total - round;
  return fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semifinales' : fromEnd === 2 ? 'Cuartos' : `Ronda ${round}`;
}
