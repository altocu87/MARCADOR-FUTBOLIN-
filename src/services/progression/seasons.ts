/**
 * Temporadas (propuesta): el ranking de temporada recalcula el ELO desde 1200 solo con
 * los clasificatorios de esa temporada. El ranking histórico no se reinicia.
 */
import type { Player, ProgressionSettings, SeasonLength, StoredMatch } from '../persistence';
import { seasonKey } from '../statistics/calendar';
import { computeProgression, type ProgressionSnapshot } from './progression';

export function seasonProgression(
  players: Player[],
  matches: StoredMatch[],
  settings: ProgressionSettings,
  length: SeasonLength,
  key: string,
): ProgressionSnapshot {
  const list = matches.filter((m) => m.config.mode === 'ranked' && seasonKey(m.finishedAt, length) === key);
  return computeProgression(players.map((p) => p.id), list, settings, { challenges: false });
}

export interface SeasonChampion {
  key: string;
  playerId: string;
  elo: number;
  rankedPlayed: number;
}

/** Campeón (mayor ELO de temporada) de cada temporada ya terminada. */
export function seasonChampions(
  players: Player[],
  matches: StoredMatch[],
  settings: ProgressionSettings,
  length: SeasonLength,
  now: number,
): SeasonChampion[] {
  const current = seasonKey(now, length);
  const keys = [...new Set(matches.filter((m) => m.config.mode === 'ranked').map((m) => seasonKey(m.finishedAt, length)))]
    .filter((k) => k !== current)
    .sort()
    .reverse();
  const out: SeasonChampion[] = [];
  for (const key of keys) {
    const prog = seasonProgression(players, matches, settings, length, key);
    const best = [...prog.players.values()]
      .filter((p) => p.rankedPlayed > 0)
      .sort((a, b) => b.elo - a.elo || b.rankedPlayed - a.rankedPlayed)[0];
    if (best) out.push({ key, playerId: best.playerId, elo: best.elo, rankedPlayed: best.rankedPlayed });
  }
  return out;
}
