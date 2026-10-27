import { SEASONS, isFinished, newGame, runSeason, score, scoreChallenge } from '@pond-steward/engine';
import type { Design, GameState, Weather } from '@pond-steward/engine';

interface Strategy {
  d: Design;
  pick: (s: GameState, w: Weather) => string[];
}

const SEEDS = 200;

/** Before a wet season: clear the outlet, and before the hurricane also lower the pond. */
const prepared = (predrain: boolean): Strategy['pick'] => (_s, w) =>
  w.season === 'wet' ? ['buffer', 'outlet', ...(predrain && w.big ? ['predrain'] : [])] : ['buffer', 'flyer'];

export const hurricaneStrategies: Record<string, Strategy> = {
  weak_small_no_actions: { d: { size: 0, plants: 0, trap: 0, fountain: 0 }, pick: () => [] },
  pretty_mow_algaecide: { d: { size: 1, plants: 0, trap: 0, fountain: 1 }, pick: () => ['mow', 'algaecide'] },
  std_outlet_only: { d: { size: 1, plants: 1, trap: 0, fountain: 0 }, pick: prepared(false) },
  std_prepared: { d: { size: 1, plants: 1, trap: 0, fountain: 0 }, pick: prepared(true) },
  std_gardens_big_outlet: { d: { size: 1, plants: 1, trap: 0, fountain: 0, outlet: 2, rainGardens: 1 }, pick: prepared(true) },
  large_wide_outlet_only: { d: { size: 2, plants: 2, trap: 0, fountain: 0 }, pick: prepared(false) },
};

export const level2GameStrategies: Record<string, Strategy> = {
  std_smart: { d: { size: 1, plants: 1, trap: 0, fountain: 0 }, pick: (_s, w) => (w.season === 'wet' ? ['buffer', 'outlet'] : ['buffer', 'flyer']) },
  std_gardens_big_outlet: { d: { size: 1, plants: 1, trap: 0, fountain: 0, outlet: 2, rainGardens: 1 }, pick: (_s, w) => (w.season === 'wet' ? ['buffer', 'outlet'] : ['buffer', 'flyer']) },
  deep_no_plants: { d: { size: 1, plants: 0, trap: 0, fountain: 0, depth: 2 }, pick: (_s, w) => (w.season === 'wet' ? ['buffer', 'outlet'] : ['buffer', 'flyer']) },
  small_outlet_gardens: { d: { size: 1, plants: 1, trap: 0, fountain: 0, outlet: 0, rainGardens: 2 }, pick: (_s, w) => (w.season === 'wet' ? ['buffer', 'outlet'] : ['buffer', 'flyer']) },
};

const pct = (n: number): number => +(100 * n / SEEDS).toFixed(1);

function play(st: Strategy, seed: number, scenario?: string): GameState {
  let s = newGame(st.d, seed, scenario === undefined ? {} : { scenario });
  while (!isFinished(s)) s = runSeason(s, st.pick(s, s.weather[s.season]!)).state;
  return s;
}

export function runLevel2(): void {
  console.log('\nLevel 2: Hurricane Year challenge (pass % over 200 seeds)');
  for (const [name, st] of Object.entries(hurricaneStrategies)) {
    const r = { pass: 0, noFlood: 0, noFishKill: 0, withinBudget: 0 };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const c = scoreChallenge(play(st, seed, 'hurricane-year'));
      r.pass += c.passed ? 1 : 0; r.noFlood += c.noFlood ? 1 : 0;
      r.noFishKill += c.noFishKill ? 1 : 0; r.withinBudget += c.withinBudget ? 1 : 0;
    }
    console.log(`L2 ${name}`.padEnd(32), JSON.stringify({ pass: pct(r.pass), noFlood: pct(r.noFlood), noFishKill: pct(r.noFishKill), withinBudget: pct(r.withinBudget) }));
  }

  console.log(`\nLevel 2: ${SEASONS}-season game with the new design options (200 seeds)`);
  for (const [name, st] of Object.entries(level2GameStrategies)) {
    const r = { unl: 0, flood: 0, wq: 0, looks: 0, cost: 0, cash: 0 };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const s = play(st, seed);
      const sc = score(s);
      r.unl += sc.unlocked ? 1 : 0; r.flood += sc.flood ? 1 : 0;
      r.wq += sc.wq; r.looks += sc.looks; r.cost += sc.cost; r.cash += s.cash;
    }
    console.log(`L2 ${name}`.padEnd(32), JSON.stringify({
      unl: +(r.unl / SEEDS).toFixed(2), flood: +(r.flood / SEEDS).toFixed(2),
      wq: +(r.wq / SEEDS).toFixed(2), looks: +(r.looks / SEEDS).toFixed(2),
      cost: +(r.cost / SEEDS).toFixed(2), cash: +(r.cash / SEEDS).toFixed(2),
    }));
  }
}
