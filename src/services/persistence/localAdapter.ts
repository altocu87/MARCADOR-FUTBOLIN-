/**
 * Adaptador local: guarda los datos como JSON en un almacén clave-valor.
 * En el navegador se usa localStorage; en las pruebas, un almacén en memoria.
 * Las escrituras fallidas (p. ej. almacenamiento lleno) lanzan StorageError
 * para que la interfaz no muestre «Guardado» sin confirmar.
 */
import { normalizePreferences } from './defaults';
import {
  STORAGE_FORMAT_VERSION,
  type ActiveMatchSnapshot,
  type Player,
  type Preferences,
  type Repositories,
  type StoredMatch,
  type Tournament,
} from './types';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

const PREFIX = `mfv3:v${STORAGE_FORMAT_VERSION}:`;

/** Claves de un espacio de datos. Los datos de prueba viven en su propio espacio («demo:»). */
export function storageKeys(namespace = '') {
  const p = `${PREFIX}${namespace}`;
  return {
    players: `${p}players`,
    matches: `${p}matches`,
    preferences: `${p}preferences`,
    activeMatch: `${p}activeMatch`,
    tournaments: `${p}tournaments`,
  } as const;
}
export const KEYS = storageKeys();
export const DEMO_NAMESPACE = 'demo:';
/** Marca de «datos de prueba activados» (fuera de ambos espacios para que el borrado no la toque). */
export const DEMO_FLAG_KEY = `${PREFIX}demoMode`;

export function createMemoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function read<T>(store: KeyValueStore, key: string, fallback: T): T {
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch (err) {
    throw new StorageError('No se pudo escribir en el almacenamiento local (¿lleno o bloqueado?).', err);
  }
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = [...list];
  copy[i] = item;
  return copy;
}

export function createLocalRepositories(store: KeyValueStore, namespace = ''): Repositories {
  const KEYS = storageKeys(namespace);
  return {
    players: {
      async list() {
        return read<Player[]>(store, KEYS.players, []);
      },
      async save(player) {
        write(store, KEYS.players, upsert(read<Player[]>(store, KEYS.players, []), player));
      },
      async saveAll(players) {
        write(store, KEYS.players, players);
      },
    },
    tournaments: {
      async list() {
        return read<Tournament[]>(store, KEYS.tournaments, []);
      },
      async save(t) {
        write(store, KEYS.tournaments, upsert(read<Tournament[]>(store, KEYS.tournaments, []), t));
      },
      async saveAll(list) {
        write(store, KEYS.tournaments, list);
      },
    },
    matches: {
      async list() {
        return read<StoredMatch[]>(store, KEYS.matches, []);
      },
      async save(match) {
        // Idempotente: reenviar el mismo partido no lo duplica.
        write(store, KEYS.matches, upsert(read<StoredMatch[]>(store, KEYS.matches, []), match));
      },
      async saveAll(matches) {
        write(store, KEYS.matches, matches);
      },
    },
    preferences: {
      async load(): Promise<Preferences> {
        return normalizePreferences(read<unknown>(store, KEYS.preferences, null));
      },
      async save(prefs) {
        write(store, KEYS.preferences, prefs);
      },
    },
    activeMatch: {
      async load() {
        const snap = read<ActiveMatchSnapshot | null>(store, KEYS.activeMatch, null);
        if (!snap || snap.formatVersion !== STORAGE_FORMAT_VERSION || !snap.state) return null;
        return snap;
      },
      async save(snapshot) {
        write(store, KEYS.activeMatch, snapshot);
      },
      async clear() {
        store.removeItem(KEYS.activeMatch);
      },
    },
    async wipe() {
      for (const key of Object.values(KEYS)) store.removeItem(key);
    },
  };
}

/** Almacén del navegador; si no está disponible, memoria (sin persistencia). */
export function browserStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const probe = `${PREFIX}probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { store: window.localStorage, persistent: true };
  } catch {
    return { store: createMemoryStore(), persistent: false };
  }
}
