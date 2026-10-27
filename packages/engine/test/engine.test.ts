import { describe, expect, it } from 'vitest';
import {
  ACTIONS, BUDGET, DUES, SEASONS, designCost, makeWeather, newGame, rngFrom, runSeason, score,
  type Design, type GameState,
} from '../src/index.js';

const standard: Design = { size: 1, plants: 1, trap: 0, fountain: 0 };

function play(design: Design, seed: number, pick: (s: GameState) => string[]): GameState {
  let s = newGame(design, seed);
  for (let i = 0; i < SEASONS; i++) s = runSeason(s, pick(s)).state;
  return s;
}

describe('rngFrom', () => {
  it('is deterministic for a seed', () => {
    const a = rngFrom(42), b = rngFrom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('differs between seeds and stays in [0, 1)', () => {
    const a = rngFrom(1), b = rngFrom(2);
    expect(a()).not.toBe(b());
    const r = rngFrom(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('makeWeather', () => {
  it('is identical for the same seed (workshop weather code)', () => {
    expect(makeWeather(123)).toEqual(makeWeather(123));
  });
  it('gives 5 years of wet then dry seasons', () => {
    const w = makeWeather(5);
    expect(w).toHaveLength(SEASONS);
    expect(w.map(x => x.season)).toEqual(Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? 'wet' : 'dry')));
  });
  it('always includes exactly one hurricane in years 2-5 and one tropical storm', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const w = makeWeather(seed);
      const hurricanes = w.filter(x => x.kind === 'hurricane');
      expect(hurricanes).toHaveLength(1);
      expect(hurricanes[0]!.year).toBeGreaterThanOrEqual(2);
      expect(w.filter(x => x.kind === 'tropical')).toHaveLength(1);
    }
  });
  it('does not use Math.random', () => {
    const orig = Math.random;
    Math.random = () => { throw new Error('Math.random called'); };
    try {
      const s = play(standard, 9, () => ['buffer', 'outlet']);
      expect(s.season).toBe(SEASONS);
    } finally {
      Math.random = orig;
    }
  });
});

describe('designCost / newGame', () => {
  it('sums the chosen options', () => {
    expect(designCost({ size: 0, plants: 0, trap: 0, fountain: 0 })).toBe(18000);
    expect(designCost({ size: 2, plants: 2, trap: 1, fountain: 1 })).toBe(40000 + 10000 + 8000 + 6000);
  });
  it('starts with the budget minus design cost and a fixed weather schedule', () => {
    const s = newGame(standard, 3);
    expect(s.cash).toBe(BUDGET - 33000);
    expect(s.plants).toBe(0.5);
    expect(s.weather).toEqual(makeWeather(3));
    expect(s.history).toEqual([]);
  });
  it('rejects an out-of-range design index', () => {
    expect(() => newGame({ ...standard, size: 9 }, 1)).toThrow(RangeError);
  });
});

describe('runSeason', () => {
  it('is pure: the previous state is not mutated and the same input gives the same output', () => {
    const s0 = newGame(standard, 11);
    const snapshot = JSON.parse(JSON.stringify(s0));
    const a = runSeason(s0, ['buffer', 'outlet']);
    const b = runSeason(s0, ['buffer', 'outlet']);
    expect(s0).toEqual(snapshot);
    expect(a).toEqual(b);
    expect(a.state).not.toBe(s0);
  });
  it('advances one season and records history', () => {
    const { state } = runSeason(newGame(standard, 1), []);
    expect(state.season).toBe(1);
    expect(state.history).toHaveLength(1);
  });
  it('charges action costs, dues and fountain power', () => {
    const noFountain = newGame(standard, 1);
    const r = runSeason(noFountain, ['outlet', 'flyer']);
    const cost = ACTIONS.find(a => a.id === 'outlet')!.cost + ACTIONS.find(a => a.id === 'flyer')!.cost;
    expect(r.report.spend).toBeGreaterThanOrEqual(cost);
    expect(r.state.cash).toBe(noFountain.cash + DUES - r.report.spend);

    const fountain = newGame({ ...standard, fountain: 1 }, 1);
    expect(runSeason(fountain, []).report.spend).toBeGreaterThanOrEqual(500);
  });
  it('rejects unknown actions', () => {
    expect(() => runSeason(newGame(standard, 1), ['nope'])).toThrow(/Unknown action/);
  });
  it('clearing the outlet resets clog before the flood check', () => {
    const s = { ...newGame(standard, 1), clog: 0.9 };
    const cleared = runSeason(s, ['outlet']).report;
    expect(cleared.before.clog).toBe(0.9);
  });
  it('algaecide cuts algae but raises nutrients', () => {
    const s = newGame(standard, 1);
    const without = runSeason(s, []).state;
    const withIt = runSeason(s, ['algaecide']).state;
    expect(withIt.A).toBeLessThan(without.A);
    expect(withIt.N).toBeGreaterThan(without.N);
  });
  it('keeps meters within 0-100', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = play({ size: 0, plants: 0, trap: 0, fountain: 0 }, seed, () => []);
      for (const k of ['N', 'A', 'fish', 'weeds', 'mood'] as const) {
        expect(s[k]).toBeGreaterThanOrEqual(0);
        expect(s[k]).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('score', () => {
  it('small pond with no actions fails every goal', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const sc = score(play({ size: 0, plants: 0, trap: 0, fountain: 0 }, seed, () => []));
      expect(sc.unlocked).toBe(false);
    }
  });
  it('mow + algaecide every season never unlocks Level 2', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const sc = score(play({ size: 1, plants: 0, trap: 0, fountain: 1 }, seed, () => ['mow', 'algaecide']));
      expect(sc.unlocked).toBe(false);
    }
  });
  it('large pond with a wide plant shelf always unlocks', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const sc = score(play({ size: 2, plants: 2, trap: 0, fountain: 0 }, seed,
        s => ['buffer', s.weather[s.season]!.season === 'wet' ? 'outlet' : 'flyer']));
      expect(sc.unlocked).toBe(true);
      expect(sc.cost).toBe(2);
    }
  });
});
