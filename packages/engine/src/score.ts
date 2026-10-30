import { SCENARIOS } from './content.js';
import type { ChallengeResult, GameState, HistoryEntry, Score } from './types.js';

export function score(s: GameState): Score {
  const h = s.history;
  const avg = (k: keyof HistoryEntry): number => h.reduce((t, x) => t + x[k], 0) / h.length;
  const avgA = avg('A'), avgExp = avg('exported'), avgMood = avg('mood'), avgN = avg('N');
  const wq = avgA < 30 && avgN < 22 ? 3 : avgA < 45 && avgN < 30 ? 2 : 1;
  const looks = avgMood >= 68 ? 3 : avgMood >= 55 ? 2 : 1;
  const cost = s.assessments > 0 ? 0 : s.cash >= 20000 ? 3 : s.cash >= 9000 ? 2 : 1;
  const flood = s.flooded === 0;
  const unlocked = flood && wq >= 2 && looks >= 2 && cost >= 2;
  return { wq, looks, cost, flood, unlocked, avgA, avgExp, avgMood, avgN };
}

/** Pass/fail for a challenge game (Hurricane Year): no flooding, no fish kill, and within budget. */
export function scoreChallenge(s: GameState): ChallengeResult {
  const challenge = s.scenario === undefined ? undefined : SCENARIOS.challenges[s.scenario];
  if (!challenge) throw new RangeError('scoreChallenge needs a game started with a scenario');
  let withinBudget = s.assessments === 0;
  for (let i = 0; i < s.history.length; i += 2) {
    const yearSpend = (s.history[i]?.spend ?? 0) + (s.history[i + 1]?.spend ?? 0);
    if (yearSpend > challenge.annualBudget) withinBudget = false;
  }
  const noFlood = s.flooded === 0;
  const noFishKill = s.fishKills === 0;
  return { noFlood, noFishKill, withinBudget, passed: noFlood && noFishKill && withinBudget };
}
