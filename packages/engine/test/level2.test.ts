import { describe, expect, it } from 'vitest';
import {
  ACTIONS, ACTIONS_L2, ALL_ACTIONS, ANNUAL_BUDGET, DESIGN_L2, MAX_PICKS, SCENARIOS,
  designCost, isFinished, makeChallengeWeather, makeWeather, newGame, runSeason, score, scoreChallenge,
  type Design, type GameState,
} from '../src/index.js';

const base: Design = { size: 1, plants: 1, trap: 0, fountain: 0 };
const HY = 'hurricane-year';

function playChallenge(design: Design, seed: number, pick: (s: GameState) => string[]): GameState {
  let s = newGame(design, seed, { scenario: HY });
  while (!isFinished(s)) s = runSeason(s, pick(s)).state;
  return s;
}
const hurricanePrep = (s: GameState): string[] => {
  const w = s.weather[s.season]!;
  return w.season === 'wet' ? ['buffer', 'outlet', ...(w.big ? ['predrain'] : [])] : ['buffer', 'flyer'];
};

describe('Level 2 content', () => {
  it('keeps Level 1 actions separate from Level 2 actions', () => {
    expect(ACTIONS).toHaveLength(7);
    expect(ACTIONS_L2.map(a => a.id)).toEqual(['predrain', 'replant', 'dredge']);
    expect(ALL_ACTIONS).toHaveLength(10);
  });
  it('defaults are the zero-effect option in every Level 2 list', () => {
    expect(DESIGN_L2.depth[1]).toMatchObject({ cost: 0, volMult: 1, internalWet: 0 });
    expect(DESIGN_L2.outlet[1]).toMatchObject({ cost: 0, capacityAdj: 0, removalAdj: 0, clogRate: 1 });
    expect(DESIGN_L2.rainGardens[0]).toMatchObject({ cost: 0, loadCut: 0, peakCut: 0 });
  });
  it('allows 2 picks in Level 1 and 5 in Level 2', () => {
    expect(MAX_PICKS[1]).toBe(2);
    expect(MAX_PICKS[2]).toBe(5);
    expect(ANNUAL_BUDGET).toBe(SCENARIOS.level2.annualBudget);
  });
});

describe('Level 2 design inputs', () => {
  it('explicit defaults behave exactly like omitting them', () => {
    const explicit: Design = { ...base, depth: 1, outlet: 1, rainGardens: 0 };
    let a = newGame(base, 4), b = newGame(explicit, 4);
    for (let i = 0; i < 10; i++) {
      const picks = i % 2 === 0 ? ['buffer', 'outlet'] : ['buffer', 'flyer'];
      a = runSeason(a, picks).state;
      b = runSeason(b, picks).state;
    }
    expect({ ...b, design: a.design }).toEqual(a);
  });
  it('adds option costs to the design cost', () => {
    expect(designCost({ ...base, depth: 2, outlet: 2, rainGardens: 3 })).toBe(33000 + 6000 + 2500 + 12000);
    expect(designCost({ ...base, depth: 0, outlet: 0 })).toBe(33000 - 2000 - 500);
  });
  it('rejects out-of-range Level 2 indexes', () => {
    expect(() => newGame({ ...base, depth: 5 }, 1)).toThrow(RangeError);
    expect(() => newGame({ ...base, outlet: -1 }, 1)).toThrow(RangeError);
    expect(() => newGame({ ...base, rainGardens: 9 }, 1)).toThrow(RangeError);
  });
  it('rain gardens cut the nutrient load and the peak storm depth', () => {
    const none = runSeason(newGame(base, 7), []).report;
    const gardens = runSeason(newGame({ ...base, rainGardens: 3 }, 7), []).report;
    expect(gardens.exported).toBeLessThan(none.exported);
    expect(gardens.stormDepth).toBeLessThan(none.stormDepth);
  });
  it('a larger outlet holds more storm water but removes less; a smaller one the reverse', () => {
    const std = runSeason(newGame(base, 7), []).report;
    const large = runSeason(newGame({ ...base, outlet: 2 }, 7), []).report;
    const small = runSeason(newGame({ ...base, outlet: 0 }, 7), []).report;
    expect(large.capacity).toBeGreaterThan(std.capacity);
    expect(large.removal).toBeLessThan(std.removal);
    expect(small.capacity).toBeLessThan(std.capacity);
    expect(small.removal).toBeGreaterThan(std.removal);
  });
  it('a smaller outlet clogs faster and a larger one slower', () => {
    const clog = (outlet: number): number => runSeason(newGame({ ...base, outlet }, 7), []).state.clog;
    expect(clog(0)).toBeGreaterThan(clog(1));
    expect(clog(2)).toBeLessThan(clog(1));
  });
  it('deeper ponds hold more storm water', () => {
    const cap = (depth: number): number => runSeason(newGame({ ...base, depth }, 7), []).report.capacity;
    expect(cap(2)).toBeGreaterThan(cap(1));
    expect(cap(0)).toBeLessThan(cap(1));
  });
  it('reports storm depth as a percent of capacity; over 100 means flooding', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = newGame({ size: 0, plants: 0, trap: 0, fountain: 0 }, seed);
      while (s.season < 10) {
        const r = runSeason(s, []);
        expect(r.report.stagePct > 100).toBe(r.report.homes > 0);
        expect(r.state.history.at(-1)!.stage).toBe(r.report.stagePct);
        s = r.state;
      }
    }
  });
});

describe('Level 2 actions', () => {
  const wetSeed = (): GameState => newGame(base, 7);
  it('predrain adds capacity in a wet season only', () => {
    const wet = wetSeed();
    expect(wet.weather[0]!.season).toBe('wet');
    expect(runSeason(wet, ['predrain']).report.capacity).toBe(runSeason(wet, []).report.capacity + 12);
    const dry = { ...wet, season: 1 };
    expect(runSeason(dry, ['predrain']).report.capacity).toBe(runSeason(dry, []).report.capacity);
  });
  it('dredge removes silt', () => {
    const silty = { ...wetSeed(), sed: 0.5 };
    expect(runSeason(silty, ['dredge']).state.sed).toBeLessThan(runSeason(silty, []).state.sed);
  });
  it('replant restores plants but never beyond the built shelf', () => {
    const worn = { ...wetSeed(), plants: 0.1 };
    const after = runSeason(worn, ['replant']).state.plants;
    expect(after).toBeGreaterThan(runSeason(worn, []).state.plants);
    expect(runSeason({ ...wetSeed(), plants: 0.5 }, ['replant']).state.plants).toBeLessThanOrEqual(0.5);
  });
  it('charges the Level 2 action costs', () => {
    const r = runSeason(wetSeed(), ['predrain', 'dredge']).report;
    expect(r.spend).toBe(800 + 4000);
  });
});

describe('Hurricane Year challenge', () => {
  it('is deterministic per seed and has four seasons with one windy hurricane', () => {
    expect(makeChallengeWeather(HY, 12)).toEqual(makeChallengeWeather(HY, 12));
    const w = makeChallengeWeather(HY, 12);
    expect(w).toHaveLength(4);
    expect(w.filter(x => x.kind === 'hurricane')).toHaveLength(1);
    const h = w.find(x => x.kind === 'hurricane')!;
    expect(h.windDamage).toBe(true);
    expect(h.stormDepth).toBeGreaterThanOrEqual(100);
    expect(h.stormDepth).toBeLessThanOrEqual(108);
  });
  it('varies with the weather code but not the structure', () => {
    const depths = new Set(Array.from({ length: 40 }, (_, i) => makeChallengeWeather(HY, i + 1)[2]!.stormDepth));
    expect(depths.size).toBeGreaterThan(3);
  });
  it('wind damage never appears in the normal weather schedule', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(makeWeather(seed).some(w => w.windDamage || w.stormDepth !== undefined)).toBe(false);
    }
  });
  it('starts from the challenge budget and records the scenario', () => {
    const s = newGame(base, 3, { scenario: HY });
    expect(s.scenario).toBe(HY);
    expect(s.cash).toBe(SCENARIOS.challenges[HY]!.budget - 33000);
    expect(s.weather).toHaveLength(4);
  });
  it('rejects unknown challenges', () => {
    expect(() => newGame(base, 1, { scenario: 'nope' })).toThrow(/Unknown challenge/);
    expect(() => makeChallengeWeather('nope', 1)).toThrow(RangeError);
  });
  it('isFinished follows the schedule length', () => {
    let s = newGame(base, 1, { scenario: HY });
    for (let i = 0; i < 3; i++) s = runSeason(s, []).state;
    expect(isFinished(s)).toBe(false);
    s = runSeason(s, []).state;
    expect(isFinished(s)).toBe(true);
  });
  it('hurricane winds damage the plant shelf', () => {
    let s = newGame(base, 5, { scenario: HY });
    s = runSeason(s, []).state;
    s = runSeason(s, []).state;
    const before = s.plants;
    const after = runSeason(s, []).state.plants;
    expect(after).toBeLessThan(before);
  });
  it('a prepared standard pond passes for some weather codes; a bare pond never does', () => {
    let passed = 0;
    for (let seed = 1; seed <= 60; seed++) {
      if (scoreChallenge(playChallenge(base, seed, hurricanePrep)).passed) passed++;
      expect(scoreChallenge(playChallenge({ size: 0, plants: 0, trap: 0, fountain: 0 }, seed, () => [])).passed).toBe(false);
    }
    expect(passed).toBeGreaterThan(10);
    expect(passed).toBeLessThan(60);
  });
  it('a bigger outlet, rain gardens and preparation pass every time', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = playChallenge({ ...base, outlet: 2, rainGardens: 1 }, seed, hurricanePrep);
      expect(scoreChallenge(s).passed).toBe(true);
    }
  });
  it('fails the budget check when a year overspends', () => {
    const s = playChallenge({ ...base, outlet: 2, rainGardens: 1 }, 1, () => ['buffer', 'dredge']);
    const c = scoreChallenge(s);
    expect(c.withinBudget).toBe(false);
    expect(c.passed).toBe(false);
  });
  it('requires a challenge game', () => {
    expect(() => scoreChallenge(newGame(base, 1))).toThrow(/scenario/);
  });
  it('does not change Level 1 scoring', () => {
    let s = newGame(base, 1);
    while (s.season < 10) s = runSeason(s, ['buffer', 'outlet']).state;
    expect(score(s).wq).toBeGreaterThan(0);
  });
});
