import type { MatchConfig, MatchMode, MatchState, ParticipantRef } from '../match-engine';
import type { StoredMatch } from '../services/persistence';
import type { SaveStatus } from './matchFinalizer';

export type RankingTab = 'standings' | 'history' | 'players' | 'fame' | 'records';
export type SettingsTab = 'general' | 'players' | 'audio' | 'progression' | 'system' | 'info';

export type Route =
  | { name: 'home' }
  | { name: 'setup'; mode: MatchMode; config?: MatchConfig }
  | { name: 'select'; config: MatchConfig; participants?: ParticipantRef[] }
  | { name: 'prematch'; config: MatchConfig; participants: ParticipantRef[] }
  | { name: 'match'; config: MatchConfig; participants: ParticipantRef[]; resume?: MatchState }
  | { name: 'summary'; match: StoredMatch; save: SaveStatus; live: MatchState }
  | { name: 'ranking'; tab?: RankingTab }
  | { name: 'matchDetail'; matchId: string }
  | { name: 'profile'; playerId: string }
  | { name: 'tournament' }
  | { name: 'settings'; tab?: SettingsTab };
