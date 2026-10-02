/**
 * Catálogo de logros PROPUESTO (pendiente de aprobación).
 * El objetivo futuro es ~50 logros y ~10 secretos; aquí se incluye una primera tanda.
 * Cada logro único solo se concede una vez, aunque se reprocese el historial.
 */
import type { StoredMatch } from '../persistence';

export type Rarity = 'common' | 'rare' | 'epic';

export const RARITY_XP: Record<Rarity, number> = { common: 25, rare: 50, epic: 100 };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Común', rare: 'Rara', epic: 'Épica' };

export type AchievementCategory = 'progresion' | 'victorias' | 'rachas' | 'goles' | 'competicion' | 'especiales';

export interface AchievementContext {
  match: StoredMatch;
  won: boolean;
  goalsFor: number;
  goalsAgainst: number;
  played: number;
  wins: number;
  winStreak: number;
  rankedPlayed: number;
  elo: number;
  level: number;
  comeback: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: Rarity;
  secret?: boolean;
  icon: string;
  check(ctx: AchievementContext): boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'debut', name: 'Debut', description: 'Completa tu primer partido.', category: 'progresion', rarity: 'common', icon: '⚑', check: (c) => c.played >= 1 },
  { id: 'veteran', name: 'Veterano', description: 'Completa 25 partidos.', category: 'progresion', rarity: 'rare', icon: '★', check: (c) => c.played >= 25 },
  { id: 'legend', name: 'Leyenda de la mesa', description: 'Completa 100 partidos.', category: 'progresion', rarity: 'epic', icon: '♛', check: (c) => c.played >= 100 },
  { id: 'level10', name: 'Nivel 10', description: 'Alcanza el nivel 10.', category: 'progresion', rarity: 'rare', icon: '⬆', check: (c) => c.level >= 10 },
  { id: 'first_win', name: 'Primera victoria', description: 'Gana tu primer partido.', category: 'victorias', rarity: 'common', icon: '✓', check: (c) => c.won && c.wins >= 1 },
  { id: 'wins10', name: 'Diez victorias', description: 'Gana 10 partidos.', category: 'victorias', rarity: 'rare', icon: '✪', check: (c) => c.wins >= 10 },
  { id: 'wins50', name: 'Cincuenta victorias', description: 'Gana 50 partidos.', category: 'victorias', rarity: 'epic', icon: '✹', check: (c) => c.wins >= 50 },
  { id: 'streak3', name: 'En racha', description: 'Gana 3 partidos seguidos.', category: 'rachas', rarity: 'common', icon: '➹', check: (c) => c.winStreak >= 3 },
  { id: 'streak5', name: 'Imparable', description: 'Gana 5 partidos seguidos.', category: 'rachas', rarity: 'rare', icon: '⚡', check: (c) => c.winStreak >= 5 },
  { id: 'streak10', name: 'Invencible', description: 'Gana 10 partidos seguidos.', category: 'rachas', rarity: 'epic', icon: '♜', check: (c) => c.winStreak >= 10 },
  { id: 'shutout', name: 'Portería a cero', description: 'Gana sin encajar ningún gol.', category: 'goles', rarity: 'rare', icon: '⛨', check: (c) => c.won && c.goalsAgainst === 0 && c.goalsFor > 0 },
  { id: 'rout', name: 'Goleada', description: 'Gana por 5 o más goles de diferencia.', category: 'goles', rarity: 'rare', icon: '✺', check: (c) => c.won && c.goalsFor - c.goalsAgainst >= 5 },
  { id: 'ranked_debut', name: 'Competidor', description: 'Juega tu primer partido clasificatorio.', category: 'competicion', rarity: 'common', icon: '⚔', check: (c) => c.rankedPlayed >= 1 },
  { id: 'platinum', name: 'Platino', description: 'Alcanza 1400 de ELO.', category: 'competicion', rarity: 'rare', icon: '◆', check: (c) => c.elo >= 1400 },
  { id: 'diamond', name: 'Diamante', description: 'Alcanza 1600 de ELO.', category: 'competicion', rarity: 'epic', icon: '◈', check: (c) => c.elo >= 1600 },
  { id: 'golden_goal', name: 'Gol de oro', description: 'Gana un partido en la prórroga.', category: 'especiales', rarity: 'rare', icon: '◎', check: (c) => c.won && c.match.result.reason === 'golden_goal' },
  { id: 'ice_cold', name: 'Sangre fría', description: 'Gana una tanda de penaltis.', category: 'especiales', rarity: 'rare', icon: '❄', check: (c) => c.won && c.match.result.reason === 'penalties' },
  { id: 'comeback', name: 'Remontada', description: 'Gana tras ir perdiendo por 2 o más goles.', category: 'especiales', rarity: 'epic', icon: '↺', check: (c) => c.won && c.comeback >= 2 },
  { id: 'chaos_win', name: 'Caos controlado', description: 'Gana un Partido Caos.', category: 'especiales', rarity: 'common', icon: '✦', check: (c) => c.won && c.match.config.mode === 'chaos' },
  { id: 'secret_marathon', name: 'Maratón', description: 'Juega un partido de más de 20 minutos.', category: 'especiales', rarity: 'rare', secret: true, icon: '⌛', check: (c) => c.match.result.totalTimeMs >= 20 * 60_000 },
];
