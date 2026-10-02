/**
 * Coordinación al finalizar: aplicación → resultado completo → repositorio local.
 * El modo prueba nunca guarda partidos, eventos, progresión ni colas.
 */
import type { MatchState } from '../match-engine';
import { STORAGE_FORMAT_VERSION, type Repositories, type StoredMatch } from '../services/persistence';

export function toStoredMatch(state: MatchState): StoredMatch {
  if (state.phase !== 'finished' || !state.result || state.finishedAt === undefined) {
    throw new Error('El partido aún no ha terminado.');
  }
  return {
    formatVersion: STORAGE_FORMAT_VERSION,
    id: state.id,
    engineVersion: state.engineVersion,
    rulesVersion: state.rulesVersion,
    config: state.config,
    participants: state.participants,
    createdAt: state.createdAt,
    startedAt: state.startedAt ?? state.createdAt,
    finishedAt: state.finishedAt,
    result: state.result,
    periods: state.periods,
    events: state.events,
    penalties: state.penalties,
  };
}

export type SaveStatus = { kind: 'test' } | { kind: 'saved' } | { kind: 'error'; message: string };

export async function persistFinishedMatch(state: MatchState, repos: Repositories): Promise<SaveStatus> {
  if (state.config.testMode) {
    await repos.activeMatch.clear().catch(() => undefined);
    return { kind: 'test' };
  }
  try {
    await repos.matches.save(toStoredMatch(state));
    await repos.activeMatch.clear();
    return { kind: 'saved' };
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}
