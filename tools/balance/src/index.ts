import { SEASONS, newGame, runSeason, score } from '@pond-steward/engine';
import { strategies } from './strategies.js';
import { runLevel2 } from './level2.js';

const SEEDS = 200;

for (const [name, st] of Object.entries(strategies)) {
  // Key order matches the original balance.js output (N comes last).
  const res = { wq: 0, looks: 0, cost: 0, flood: 0, unl: 0, cash: 0, A: 0, mood: 0, kills: 0, N: 0 };
  for (let seed = 1; seed <= SEEDS; seed++) {
    let s = newGame(st.d, seed);
    for (let i = 0; i < SEASONS; i++) {
      const w = s.weather[s.season]!;
      s = runSeason(s, st.pick(s, w)).state;
    }
    const sc = score(s);
    res.wq += sc.wq; res.looks += sc.looks; res.cost += sc.cost;
    res.flood += sc.flood ? 1 : 0; res.unl += sc.unlocked ? 1 : 0;
    res.cash += s.cash; res.A += sc.avgA; res.N += sc.avgN;
    res.mood += sc.avgMood; res.kills += s.fishKills;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(res)) out[k] = +(v / SEEDS).toFixed(2);
  console.log(name.padEnd(22), JSON.stringify(out));
}

runLevel2();
