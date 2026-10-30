import { rngFrom } from './rng.js';
import type { Weather } from './types.js';
import { SCENARIOS } from './content.js';

/** Weather schedule for the whole game, fixed by seed (same seed = same weather for a workshop). */
export function makeWeather(seed: number): Weather[] {
  const r = rngFrom(seed * 7 + 3);
  const list: Weather[] = [];
  const bigYear = 1 + Math.floor(r() * 4); // a hurricane in year 2-5
  let tsYear = Math.floor(r() * 5);
  if (tsYear === bigYear) tsYear = (tsYear + 2) % 5;
  const droughtYear = r() < 0.6 ? Math.floor(r() * 5) : -1;
  for (let y = 0; y < 5; y++) {
    // wet season Jun-Oct
    const heat = r() < 0.45;
    let w: Weather = { season: 'wet', year: y + 1, kind: 'typical', rain: Math.round(26 + r() * 8), mult: 1.0, storm: false, big: false, heat, surprise: null, roll: 0 };
    if (y === bigYear) w = { ...w, kind: 'hurricane', rain: w.rain + 14, mult: 1.6, storm: true, big: true };
    else if (y === tsYear) w = { ...w, kind: 'tropical', rain: w.rain + 8, mult: 1.3, storm: true };
    list.push(w);
    // dry season Nov-May
    let d: Weather = { season: 'dry', year: y + 1, kind: 'typical', rain: Math.round(10 + r() * 6), mult: 0.45, storm: false, big: false, heat: false, surprise: null, roll: 0 };
    if (y === droughtYear) d = { ...d, kind: 'drought', rain: Math.round(4 + r() * 2), mult: 0.2, drought: true };
    list.push(d);
  }
  // surprises
  for (const w of list) {
    const s = r();
    w.surprise = s < 0.14 ? 'clippings' : s < 0.26 ? 'construction' : null;
    w.roll = r();
  }
  return list;
}

/** Fixed weather schedule for a challenge scenario. The structure comes from the scenario JSON; the seed only varies rain a little and which wet seasons are hot. */
export function makeChallengeWeather(id: string, seed: number): Weather[] {
  const challenge = SCENARIOS.challenges[id];
  if (!challenge) throw new RangeError(`Unknown challenge "${id}"`);
  const r = rngFrom(seed * 11 + 5);
  return challenge.seasons.map((t, i) => {
    const heat = t.season === 'wet' ? r() < (t.heatChance ?? 0.45) : false;
    const rain = t.rain + Math.round(r() * (t.rainJitter ?? 0));
    const roll = r();
    const w: Weather = {
      season: t.season, year: Math.floor(i / 2) + 1, kind: t.kind, rain, mult: t.mult,
      storm: t.storm, big: t.big, heat, surprise: null, roll,
    };
    if (t.kind === 'drought') w.drought = true;
    if (t.stormDepth !== undefined) {
      w.stormDepth = t.stormDepth;
      if (t.stormDepthJitter) w.stormDepth += Math.round(r() * t.stormDepthJitter);
    }
    if (t.windDamage) w.windDamage = true;
    return w;
  });
}
