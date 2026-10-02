/**
 * Contratos de datos y repositorios.
 * Durante las entregas locales se implementan con almacenamiento del navegador;
 * en la última fase se podrá añadir un adaptador remoto detrás de los mismos contratos.
 */
import type {
  MatchConfig,
  MatchEvent,
  MatchResult,
  MatchState,
  ParticipantRef,
  PenaltyKick,
  PeriodRecord,
  Team,
} from '../../match-engine';

export const STORAGE_FORMAT_VERSION = 1;

export interface Player {
  id: string;
  name: string;
  alias?: string;
  /** Foto opcional como data URL (redimensionada en local). */
  photo?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Partido terminado y guardado. Permite reconstruir el encuentro completo. */
export interface StoredMatch {
  formatVersion: number;
  id: string;
  engineVersion: string;
  rulesVersion: string;
  config: MatchConfig;
  participants: ParticipantRef[];
  createdAt: number;
  startedAt: number;
  finishedAt: number;
  result: MatchResult;
  periods: PeriodRecord[];
  events: MatchEvent[];
  penalties: PenaltyKick[];
}

export type EffectsLevel = 'full' | 'reduced' | 'off';

export interface ProgressionSettings {
  /** Si está desactivada se muestra «Clasificación pendiente». */
  enabled: boolean;
  eloInitial: number;
  kProvisional: number;
  kEstablished: number;
  /** Partidos clasificatorios con K provisional. */
  provisionalMatches: number;
  /** Multiplicador por diferencia de goles (propuesta, desactivado por defecto). */
  goalDiffMultiplier: boolean;
}

export interface Preferences {
  formatVersion: number;
  /** Valor inicial del interruptor de modo prueba al preparar un partido. */
  testModeDefault: boolean;
  volume: number;
  muted: boolean;
  effects: EffectsLevel;
  /** Minutos de inactividad antes del reposo (0 = desactivado). */
  sleepMinutes: number;
  defaultEndCondition: MatchConfig['endCondition'];
  defaultGoalsPerPeriod: number;
  defaultMinutesPerPeriod: number;
  penaltyFirstTeam: Team;
  progression: ProgressionSettings;
}

/** Snapshot versionado de la partida en curso para ofrecer reanudar o descartar. */
export interface ActiveMatchSnapshot {
  formatVersion: number;
  savedAt: number;
  state: MatchState;
}

export interface PlayerRepository {
  list(): Promise<Player[]>;
  save(player: Player): Promise<void>;
  saveAll(players: Player[]): Promise<void>;
}

export interface MatchRepository {
  list(): Promise<StoredMatch[]>;
  save(match: StoredMatch): Promise<void>;
  saveAll(matches: StoredMatch[]): Promise<void>;
}

export interface PreferencesRepository {
  load(): Promise<Preferences>;
  save(prefs: Preferences): Promise<void>;
}

export interface ActiveMatchRepository {
  load(): Promise<ActiveMatchSnapshot | null>;
  save(snapshot: ActiveMatchSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export interface Repositories {
  players: PlayerRepository;
  matches: MatchRepository;
  preferences: PreferencesRepository;
  activeMatch: ActiveMatchRepository;
  /** Borra todos los datos locales de la aplicación. */
  wipe(): Promise<void>;
}
