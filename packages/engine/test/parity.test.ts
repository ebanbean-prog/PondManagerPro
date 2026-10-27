import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { ACTIONS, DESIGN, newGame, runSeason, score, type Design, type GameState } from '../src/index.js';

// Frozen copy of the original prototype engine (engine.js at the repo root).
const legacy = createRequire(import.meta.url)('./fixtures/legacy-engine.cjs');

const designs: Design[] = [];
for (let size = 0; size < DESIGN.size.length; size++)
  for (let plants = 0; plants < DESIGN.plants.length; plants++)
    for (let trap = 0; trap < DESIGN.trap.length; trap++)
      for (let fountain = 0; fountain < DESIGN.fountain.length; fountain++)
        designs.push({ size, plants, trap, fountain });

/** Deterministic pseudo-random action choices so every action gets exercised. */
function picksFor(seed: number, season: number): string[] {
  const ids = ACTIONS.map(a => a.id);
  const a = ids[(seed * 3 + season * 5) % ids.length]!;
  const b = ids[(seed * 7 + season * 2 + 1) % ids.length]!;
  return season % 4 === 3 ? [] : a === b ? [a] : [a, b];
}

describe('parity with the original engine.js', () => {
  it('has identical design options and actions', () => {
    expect(DESIGN).toEqual(legacy.DESIGN);
    expect(ACTIONS).toEqual(legacy.ACTIONS);
  });

  it('matches newGame, every runSeason state and report, and score', () => {
    for (const design of designs) {
      for (let seed = 1; seed <= 25; seed++) {
        let a: GameState = newGame(design, seed);
        let b = legacy.newGame(design, seed);
        expect(a).toEqual(b);
        for (let i = 0; i < 10; i++) {
          const picks = picksFor(seed, i);
          const ra = runSeason(a, picks);
          const rb = legacy.runSeason(b, picks);
          expect(ra.report).toEqual(rb.report);
          expect(ra.state).toEqual(rb.state);
          a = ra.state;
          b = rb.state;
        }
        expect(score(a)).toEqual(legacy.score(b));
      }
    }
  });
});
