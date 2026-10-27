import type { GameState, HistoryEntry, Score } from './types.js';

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
