import type { MatchConfig, ParticipantRef, Team } from './types';

/** Rangos de referencia del simulador (ajustables, no límites definitivos del producto). */
export const CONFIG_LIMITS = {
  goalsPerPeriod: { min: 1, max: 20 },
  minutesPerPeriod: { min: 1, max: 30 },
  overtimeSeconds: { min: 10, max: 600 },
  penaltyRounds: { min: 1, max: 10 },
} as const;

export const DEFAULT_CONFIG: MatchConfig = {
  mode: 'quick',
  endCondition: 'goals',
  goalsPerPeriod: 5,
  minutesPerPeriod: 5,
  overtimeSeconds: 60,
  penaltyRounds: 5,
  penaltyFirstTeam: 'white',
  testMode: true,
};

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

export function validateConfig(config: MatchConfig): string[] {
  const errors: string[] = [];
  if (!['quick', 'chaos', 'ranked'].includes(config.mode)) errors.push('Modalidad no válida.');
  if (!['goals', 'time', 'both'].includes(config.endCondition)) errors.push('Condición de final no válida.');
  const checks: [keyof typeof CONFIG_LIMITS, string][] = [
    ['goalsPerPeriod', 'Objetivo de goles'],
    ['minutesPerPeriod', 'Duración por parte'],
    ['overtimeSeconds', 'Duración de la prórroga'],
    ['penaltyRounds', 'Lanzamientos de la tanda'],
  ];
  for (const [key, label] of checks) {
    const value = config[key];
    const { min, max } = CONFIG_LIMITS[key];
    if (!isInt(value) || value < min || value > max) errors.push(`${label} debe estar entre ${min} y ${max}.`);
  }
  if (config.penaltyFirstTeam !== 'white' && config.penaltyFirstTeam !== 'blue') {
    errors.push('Equipo inicial de penaltis no válido.');
  }
  if (typeof config.testMode !== 'boolean') errors.push('Modo prueba no válido.');
  return errors;
}

/**
 * Exactamente 2 (1v1) o 4 (2v2) jugadores, sin duplicados,
 * con equipos completos y plazas coherentes.
 */
export function validateParticipants(participants: ParticipantRef[]): string[] {
  const errors: string[] = [];
  const n = participants.length;
  if (n !== 2 && n !== 4) {
    errors.push('Selecciona 2 jugadores (1 contra 1) o 4 jugadores (2 contra 2).');
    return errors;
  }
  const ids = new Set(participants.map((p) => p.playerId));
  if (ids.size !== n) errors.push('Un jugador no puede ocupar dos plazas.');
  const perTeam = n / 2;
  for (const team of ['white', 'blue'] as Team[]) {
    const members = participants.filter((p) => p.team === team);
    if (members.length !== perTeam) errors.push('Los equipos deben estar completos y equilibrados.');
    const slots = new Set(members.map((m) => m.slot));
    if (slots.size !== members.length) errors.push('Plazas repetidas en un equipo.');
    for (const m of members) if (m.slot > perTeam) errors.push('Plaza no válida.');
  }
  return [...new Set(errors)];
}
