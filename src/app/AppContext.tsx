/**
 * Composición de servicios de la aplicación: repositorios locales, datos cargados,
 * progresión derivada y navegación. La interfaz consume este contexto.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_PREFERENCES,
  browserStore,
  createLocalRepositories,
  type Player,
  type Preferences,
  type Repositories,
  type StoredMatch,
  type Tournament,
} from '../services/persistence';
import { computeProgression, type ProgressionSnapshot } from '../services/progression';
import { sound } from '../services/sound/sound';
import { voice } from '../services/sound/voice';
import type { Route } from './routes';

interface AppContextValue {
  repos: Repositories;
  persistent: boolean;
  loaded: boolean;
  players: Player[];
  matches: StoredMatch[];
  tournaments: Tournament[];
  prefs: Preferences;
  /** null cuando la progresión está desactivada («Clasificación pendiente»). */
  progression: ProgressionSnapshot | null;
  refresh(): Promise<void>;
  savePlayer(player: Player): Promise<void>;
  saveMatch(match: StoredMatch): Promise<void>;
  deleteMatch(id: string): Promise<void>;
  saveTournament(tournament: Tournament): Promise<void>;
  savePrefs(prefs: Preferences): Promise<void>;
  route: Route;
  navigate(route: Route): void;
  toast(message: string): void;
  toastMessage: string | null;
}

const Ctx = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp fuera de AppProvider');
  return v;
}

export function AppProvider({ children, repos: injected }: { children: ReactNode; repos?: Repositories }) {
  const [{ repos, persistent }] = useState(() => {
    if (injected) return { repos: injected, persistent: true };
    const { store, persistent } = browserStore();
    return { repos: createLocalRepositories(store), persistent };
  });
  const [loaded, setLoaded] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<StoredMatch[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [p, m, pr, t] = await Promise.all([
      repos.players.list(),
      repos.matches.list(),
      repos.preferences.load(),
      repos.tournaments.list(),
    ]);
    setPlayers(p);
    setMatches(m);
    setTournaments(t);
    setPrefs(pr);
    setLoaded(true);
  }, [repos]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    sound.configure(prefs.volume, prefs.muted, prefs.goalSound);
    voice.configure(prefs.voice && !prefs.muted);
  }, [prefs.volume, prefs.muted, prefs.goalSound, prefs.voice]);

  const savePlayer = useCallback(
    async (player: Player) => {
      await repos.players.save(player);
      setPlayers(await repos.players.list());
    },
    [repos],
  );

  const saveMatch = useCallback(
    async (match: StoredMatch) => {
      await repos.matches.save(match);
      setMatches(await repos.matches.list());
    },
    [repos],
  );

  // Borrar un partido: estadísticas, ELO, XP, logros y récords se recalculan solos.
  const deleteMatch = useCallback(
    async (id: string) => {
      const list = await repos.matches.list();
      await repos.matches.saveAll(list.filter((m) => m.id !== id));
      setMatches(await repos.matches.list());
    },
    [repos],
  );

  const saveTournament = useCallback(
    async (t: Tournament) => {
      await repos.tournaments.save(t);
      setTournaments(await repos.tournaments.list());
    },
    [repos],
  );

  const savePrefs = useCallback(
    async (next: Preferences) => {
      await repos.preferences.save(next);
      setPrefs(next);
    },
    [repos],
  );

  const progression = useMemo(
    () =>
      prefs.progression.enabled
        ? computeProgression(
            players.map((p) => p.id),
            matches,
            prefs.progression,
            { tournaments, challenges: prefs.challenges },
          )
        : null,
    [players, matches, tournaments, prefs.progression, prefs.challenges],
  );

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage((m) => (m === message ? null : m)), 2600);
  }, []);

  const navigate = useCallback((next: Route) => setRoute(next), []);

  const value: AppContextValue = {
    repos,
    persistent,
    loaded,
    players,
    matches,
    tournaments,
    prefs,
    progression,
    refresh,
    savePlayer,
    saveMatch,
    deleteMatch,
    saveTournament,
    savePrefs,
    route,
    navigate,
    toast,
    toastMessage,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
