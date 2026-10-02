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
} from '../services/persistence';
import { computeProgression, type ProgressionSnapshot } from '../services/progression';
import { sound } from '../services/sound/sound';
import type { Route } from './routes';

interface AppContextValue {
  repos: Repositories;
  persistent: boolean;
  loaded: boolean;
  players: Player[];
  matches: StoredMatch[];
  prefs: Preferences;
  /** null cuando la progresión está desactivada («Clasificación pendiente»). */
  progression: ProgressionSnapshot | null;
  refresh(): Promise<void>;
  savePlayer(player: Player): Promise<void>;
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
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [p, m, pr] = await Promise.all([repos.players.list(), repos.matches.list(), repos.preferences.load()]);
    setPlayers(p);
    setMatches(m);
    setPrefs(pr);
    setLoaded(true);
  }, [repos]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    sound.configure(prefs.volume, prefs.muted);
  }, [prefs.volume, prefs.muted]);

  const savePlayer = useCallback(
    async (player: Player) => {
      await repos.players.save(player);
      setPlayers(await repos.players.list());
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
          )
        : null,
    [players, matches, prefs.progression],
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
    prefs,
    progression,
    refresh,
    savePlayer,
    savePrefs,
    route,
    navigate,
    toast,
    toastMessage,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
