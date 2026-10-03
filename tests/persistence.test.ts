import { describe, expect, it } from 'vitest';
import { persistFinishedMatch } from '../src/app/matchFinalizer';
import { DEFAULT_CONFIG, advance, createMatch, dispatch, type MatchConfig, type MatchState } from '../src/match-engine';
import {
  KEYS,
  StorageError,
  applyImport,
  buildBackup,
  createLocalRepositories,
  createMemoryStore,
  parseBackup,
  previewImport,
  type KeyValueStore,
} from '../src/services/persistence';
import { createPlayer } from '../src/services/players';
import { makeMatch } from './helpers';

function finishedMatch(config: Partial<MatchConfig>): MatchState {
  // Por tiempo: dos partes de 1 minuto, Blanco marca en cada una.
  let s = createMatch('mx', { ...DEFAULT_CONFIG, endCondition: 'time', minutesPerPeriod: 1, ...config }, [
    { playerId: 'a', team: 'white', slot: 1, nameSnapshot: 'A' },
    { playerId: 'b', team: 'blue', slot: 1, nameSnapshot: 'B' },
  ], 0);
  const run = (c: Parameters<typeof dispatch>[1], t: number) => (s = dispatch(s, c, t).state);
  run({ type: 'SKIP_COUNTDOWN' }, 0);
  run({ type: 'GOAL', team: 'white' }, 1000);
  run({ type: 'CONTINUE' }, 61_000);
  run({ type: 'SKIP_COUNTDOWN' }, 61_000);
  run({ type: 'GOAL', team: 'white' }, 65_000);
  s = advance(s, 121_000).state;
  expect(s.phase).toBe('finished');
  return s;
}

describe('Repositorio local', () => {
  it('conserva jugadores y partidos entre aperturas', async () => {
    const store = createMemoryStore();
    const r1 = createLocalRepositories(store);
    await r1.players.save(createPlayer({ name: 'Ana' }, 1));
    await r1.matches.save(makeMatch({ white: ['a'], blue: ['b'], goals: 'W' }));
    const r2 = createLocalRepositories(store);
    expect(await r2.players.list()).toHaveLength(1);
    expect(await r2.matches.list()).toHaveLength(1);
  });
  it('guardar el mismo partido dos veces no lo duplica', async () => {
    const repos = createLocalRepositories(createMemoryStore());
    const m = makeMatch({ white: ['a'], blue: ['b'], goals: 'W' });
    await repos.matches.save(m);
    await repos.matches.save(m);
    expect(await repos.matches.list()).toHaveLength(1);
  });
  it('datos corruptos no rompen la carga', async () => {
    const store = createMemoryStore();
    store.setItem(KEYS.players, '{no json');
    const repos = createLocalRepositories(store);
    expect(await repos.players.list()).toEqual([]);
    expect((await repos.preferences.load()).testModeDefault).toBe(false);
  });
  it('almacenamiento lleno: error explícito', async () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const repos = createLocalRepositories(full);
    await expect(repos.players.save(createPlayer({ name: 'X' }, 1))).rejects.toBeInstanceOf(StorageError);
  });
});

describe('Modo prueba y finalización', () => {
  it('el modo prueba no guarda el partido', async () => {
    const repos = createLocalRepositories(createMemoryStore());
    const status = await persistFinishedMatch(finishedMatch({ testMode: true }), repos);
    expect(status.kind).toBe('test');
    expect(await repos.matches.list()).toHaveLength(0);
  });
  it('un partido real se guarda completo (reconstruible)', async () => {
    const repos = createLocalRepositories(createMemoryStore());
    const status = await persistFinishedMatch(finishedMatch({ testMode: false }), repos);
    expect(status.kind).toBe('saved');
    const [m] = await repos.matches.list();
    expect(m.result.score).toEqual({ white: 2, blue: 0 });
    expect(m.events.some((e) => e.type === 'GOAL')).toBe(true);
    expect(m.periods).toHaveLength(2);
  });
  it('fallo de escritura: informa sin marcar como guardado', async () => {
    const store = createMemoryStore();
    const repos = createLocalRepositories({ ...store, setItem: () => { throw new Error('full'); } });
    const status = await persistFinishedMatch(finishedMatch({ testMode: false }), repos);
    expect(status.kind).toBe('error');
  });
});

describe('Backup', () => {
  it('exporta, valida e importa (combinar sin sobrescribir)', async () => {
    const src = createLocalRepositories(createMemoryStore());
    const ana = createPlayer({ name: 'Ana' }, 1);
    await src.players.save(ana);
    await src.matches.save(makeMatch({ white: ['a'], blue: ['b'], goals: 'W' }));
    const text = JSON.stringify(await buildBackup(src));

    const dst = createLocalRepositories(createMemoryStore());
    await dst.players.save({ ...ana, name: 'Ana local' });
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const preview = await previewImport(dst, parsed.backup);
    expect(preview.players).toEqual({ total: 1, new: 0, existing: 1 });
    expect(preview.matches.new).toBe(1);
    await applyImport(dst, parsed.backup, 'merge');
    const players = await dst.players.list();
    expect(players).toHaveLength(1);
    expect(players[0].name).toBe('Ana local');
    expect(await dst.matches.list()).toHaveLength(1);
  });
  it('rechaza archivos inválidos', () => {
    expect(parseBackup('hola').ok).toBe(false);
    expect(parseBackup('{"app":"otra"}').ok).toBe(false);
    expect(parseBackup('{"app":"marcador-futbolin-v3","formatVersion":1,"players":[{"x":1}],"matches":[]}').ok).toBe(false);
  });
});
