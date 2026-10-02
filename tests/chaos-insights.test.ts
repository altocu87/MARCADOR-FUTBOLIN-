import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  createMatch,
  dispatch,
  getScore,
  goalMoment,
  goalStreak,
  matchPointTeams,
  type EngineCommand,
  type MatchConfig,
  type MatchState,
} from '../src/match-engine';

const P2 = [
  { playerId: 'a', team: 'white' as const, slot: 1 as const, nameSnapshot: 'A' },
  { playerId: 'b', team: 'blue' as const, slot: 1 as const, nameSnapshot: 'B' },
];

function run(config: Partial<MatchConfig>) {
  let s: MatchState = createMatch('m', { ...DEFAULT_CONFIG, testMode: false, ...config }, P2, 0);
  let t = 0;
  const api = {
    get s() {
      return s;
    },
    at(ms: number) {
      t = ms;
      return api;
    },
    cmd(c: EngineCommand) {
      const o = dispatch(s, c, t);
      s = o.state;
      return o;
    },
  };
  api.cmd({ type: 'SKIP_COUNTDOWN' });
  return api;
}

describe('Caos: comodín', () => {
  it('el siguiente gol del equipo vale doble y se consume', () => {
    const m = run({ mode: 'chaos', goalsPerPeriod: 10, chaos: { jokers: true, doubleLastMinute: false } });
    expect(m.cmd({ type: 'TOGGLE_JOKER', team: 'white' }).accepted).toBe(true);
    m.at(1000).cmd({ type: 'GOAL', team: 'white' });
    expect(getScore(m.s)).toEqual({ white: 2, blue: 0 });
    expect(m.s.jokers?.white).toBe('used');
    m.at(5000).cmd({ type: 'GOAL', team: 'white' });
    expect(getScore(m.s).white).toBe(3);
    expect(m.cmd({ type: 'TOGGLE_JOKER', team: 'white' }).accepted).toBe(false);
  });
  it('−1 sobre un gol doble resta 2 y deshacer lo restaura', () => {
    const m = run({ mode: 'chaos', goalsPerPeriod: 10, chaos: { jokers: true, doubleLastMinute: false } });
    m.cmd({ type: 'TOGGLE_JOKER', team: 'blue' });
    m.at(1000).cmd({ type: 'GOAL', team: 'blue' });
    m.at(1500).cmd({ type: 'MINUS_ONE', team: 'blue' });
    expect(getScore(m.s).blue).toBe(0);
    m.cmd({ type: 'UNDO' });
    expect(getScore(m.s).blue).toBe(2);
  });
  it('desactivado fuera de Caos', () => {
    const m = run({ mode: 'quick', chaos: { jokers: true, doubleLastMinute: true } });
    expect(m.cmd({ type: 'TOGGLE_JOKER', team: 'white' }).reason).toBe('rule_disabled');
  });
});

describe('Caos: último minuto', () => {
  it('goles con ≤60 s restantes valen doble', () => {
    const m = run({ mode: 'chaos', endCondition: 'time', minutesPerPeriod: 2, chaos: { jokers: false, doubleLastMinute: true } });
    m.at(30_000).cmd({ type: 'GOAL', team: 'white' });
    m.at(60_000).cmd({ type: 'GOAL', team: 'white' });
    expect(getScore(m.s).white).toBe(3);
  });
  it('POR GOLES no tiene último minuto', () => {
    const m = run({ mode: 'chaos', endCondition: 'goals', chaos: { jokers: false, doubleLastMinute: true } });
    m.at(500_000).cmd({ type: 'GOAL', team: 'white' });
    expect(getScore(m.s).white).toBe(1);
  });
});

describe('Avisos', () => {
  it('bola de partido en la 2ª parte', () => {
    const m = run({ goalsPerPeriod: 2 });
    m.at(1000).cmd({ type: 'GOAL', team: 'white' });
    m.at(5000).cmd({ type: 'GOAL', team: 'white' });
    m.cmd({ type: 'CONTINUE' });
    m.cmd({ type: 'SKIP_COUNTDOWN' });
    expect(matchPointTeams(m.s)).toEqual([]);
    m.at(9000).cmd({ type: 'GOAL', team: 'blue' });
    // 2–1, queda 1 gol en la parte: Blanco gana si marca; Azul empataría.
    expect(matchPointTeams(m.s)).toEqual(['white']);
  });
  it('racha y remontada', () => {
    const m = run({ goalsPerPeriod: 10 });
    let t = 0;
    for (const team of ['blue', 'blue', 'white', 'white'] as const) {
      t += 4000;
      m.at(t).cmd({ type: 'GOAL', team });
    }
    expect(goalStreak(m.s)).toEqual({ team: 'white', count: 2 });
    const last = m.s.events.filter((e) => e.type === 'GOAL').pop()!;
    expect(goalMoment(m.s, last)).toBe('comeback');
  });
  it('empate y ponerse por delante', () => {
    const m = run({ goalsPerPeriod: 10 });
    m.at(4000).cmd({ type: 'GOAL', team: 'blue' });
    m.at(8000).cmd({ type: 'GOAL', team: 'white' });
    let last = m.s.events.filter((e) => e.type === 'GOAL').pop()!;
    expect(goalMoment(m.s, last)).toBe('equalizer');
    m.at(12000).cmd({ type: 'GOAL', team: 'white' });
    last = m.s.events.filter((e) => e.type === 'GOAL').pop()!;
    expect(goalMoment(m.s, last)).toBe('lead');
  });
});
