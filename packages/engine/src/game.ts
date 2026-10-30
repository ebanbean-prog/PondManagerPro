import {
  ALL_ACTIONS, BUDGET, DEFAULT_DEPTH, DEFAULT_OUTLET, DEFAULT_RAIN_GARDENS, DESIGN, DESIGN_L2,
  DUES, FOUNTAIN_POWER, SCENARIOS,
} from './content.js';
import { clamp } from './rng.js';
import { makeChallengeWeather, makeWeather } from './weather.js';
import type { Design, GameState, SeasonEvent, SeasonReport } from './types.js';

function at<T>(list: readonly T[], i: number, what: string): T {
  const item = list[i];
  if (item === undefined) throw new RangeError(`No ${what} option at index ${i}`);
  return item;
}

function level2Options(d: Design) {
  return {
    depth: at(DESIGN_L2.depth, d.depth ?? DEFAULT_DEPTH, 'depth'),
    outlet: at(DESIGN_L2.outlet, d.outlet ?? DEFAULT_OUTLET, 'outlet'),
    gardens: at(DESIGN_L2.rainGardens, d.rainGardens ?? DEFAULT_RAIN_GARDENS, 'rainGardens'),
  };
}

export function designCost(d: Design): number {
  const l2 = level2Options(d);
  return at(DESIGN.size, d.size, 'size').cost
    + at(DESIGN.plants, d.plants, 'plants').cost
    + at(DESIGN.trap, d.trap, 'trap').cost
    + at(DESIGN.fountain, d.fountain, 'fountain').cost
    + l2.depth.cost + l2.outlet.cost + l2.gardens.cost;
}

/** True once every season in the game's weather schedule has been played. */
export function isFinished(s: GameState): boolean {
  return s.season >= s.weather.length;
}

export function newGame(design: Design, seed: number, opts: { scenario?: string } = {}): GameState {
  const cost = designCost(design);
  const challenge = opts.scenario === undefined ? undefined : SCENARIOS.challenges[opts.scenario];
  if (opts.scenario !== undefined && !challenge) throw new RangeError(`Unknown challenge "${opts.scenario}"`);
  return {
    seed, design, season: 0,
    ...(opts.scenario === undefined ? {} : { scenario: opts.scenario }),
    weather: challenge ? makeChallengeWeather(opts.scenario!, seed) : makeWeather(seed),
    cash: (challenge ? challenge.budget : BUDGET) - cost,
    N: 28, A: 22, fish: 70, weeds: 10, sed: 0, clog: 0.1, outreach: 0, trapFill: 0,
    plants: at(DESIGN.plants, design.plants, 'plants').p,
    mood: 70, flooded: 0, assessments: 0, fishKills: 0,
    history: [],
  };
}

/** Run one season. Returns a new state and a report. picks = array of action ids (max 2). */
export function runSeason(prev: GameState, picks: string[]): { state: GameState; report: SeasonReport } {
  const s: GameState = JSON.parse(JSON.stringify(prev));
  const w = at(s.weather, s.season, 'season');
  const d = s.design;
  const has = (id: string): boolean => picks.includes(id);
  const wet = w.season === 'wet';
  const l2 = level2Options(d);
  const vol = at(DESIGN.size, d.size, 'size').vol * l2.depth.volMult;
  const plantShelf = at(DESIGN.plants, d.plants, 'plants').p;
  const fountain = d.fountain === 1;
  const before = { A: s.A, N: s.N, fish: s.fish, mood: s.mood, cash: s.cash, clog: s.clog };
  const why: string[] = [];
  const events: SeasonEvent[] = [];
  let spend = 0;

  for (const id of picks) {
    const action = ALL_ACTIONS.find(a => a.id === id);
    if (!action) throw new RangeError(`Unknown action "${id}"`);
    spend += action.cost;
  }
  if (fountain) spend += FOUNTAIN_POWER;

  // Actions that happen at the start of the season
  if (has('flyer')) s.outreach = clamp(s.outreach + 0.25, 0, 1);
  if (has('outlet')) s.clog = 0;
  if (has('trapclean')) s.trapFill = 0;
  if (has('harvest')) { s.weeds = clamp(s.weeds - 25, 0, 100); s.N = clamp(s.N - 6, 0, 100); s.A = clamp(s.A - 10, 0, 100); }
  if (has('dredge')) s.sed = clamp(s.sed - 0.3, 0, 1);
  if (has('replant')) s.plants = clamp(s.plants + 0.15, 0, plantShelf);
  if (w.windDamage) s.plants = clamp(s.plants - 0.2, 0, 1);

  let edge = 1, looksEdge = 0;
  if (has('mow')) { edge = 1.2; looksEdge = 10; s.plants = clamp(s.plants - 0.12, 0, 1); }
  else if (has('buffer')) { edge = 0.82; looksEdge = -5; s.plants = clamp(s.plants + 0.04, 0, plantShelf + 0.1); }

  // Watershed load
  let load = 40 * w.mult * (1 - 0.4 * s.outreach) * edge;
  load *= 1 - l2.gardens.loadCut;
  if (w.surprise === 'clippings') {
    load += has('buffer') ? 3 : 9;
    events.push({ k: 'clippings', t: has('buffer') ? 'A neighbor blew grass clippings toward the pond. Your no-mow strip caught most of them.' : 'A neighbor blew grass clippings into the pond. They rot and feed algae.' });
  }
  let sedIn = 0.04 * w.mult;
  if (w.surprise === 'construction') { load += 6; sedIn += 0.12; events.push({ k: 'construction', t: 'A new house went up next door. Muddy runoff washed toward the pond.' }); }

  // Sediment trap
  if (d.trap === 1) {
    const working = s.trapFill < 0.6;
    const eff = working ? 0.25 : 0.05;
    load *= (1 - eff);
    sedIn *= working ? 0.3 : 0.9;
    s.trapFill = clamp(s.trapFill + 0.12 * w.mult + (w.surprise === 'construction' ? 0.2 : 0), 0, 1);
  }
  s.sed = clamp(s.sed + sedIn, 0, 1);

  // Treatment
  const effVol = vol * (1 - 0.5 * s.sed);
  const removal = clamp(0.25 + 0.4 * effVol + 0.25 * s.plants + l2.outlet.removalAdj, 0, 0.88);
  let internal = 0;
  if (wet && s.A > 60 && !fountain) internal += 6;
  if (w.drought) internal += 6;
  if (wet && !fountain) internal += l2.depth.internalWet;
  const exported = load * (1 - removal);
  s.N = clamp(s.N * 0.5 + exported + internal, 0, 100);

  // Algae
  const target = s.N * 2.0 * (wet ? 1 : 0.6) * (w.heat ? 1.25 : 1) * (w.drought ? 1.3 : 1) - s.plants * 15 - (fountain ? 10 : 0);
  s.A = clamp(0.5 * s.A + 0.5 * target, 0, 100);
  if (has('algaecide')) {
    s.A = clamp(s.A * 0.35, 0, 100);
    s.N = clamp(s.N + 8, 0, 100);
  }

  // Weeds
  s.weeds = clamp(s.weeds + (s.N > 30 ? 8 : 3) - s.plants * 3, 0, 100);

  // Oxygen and fish
  let kill = false;
  if (wet && !fountain && (s.A > 62 || (w.heat && s.A > 48))) kill = true;
  if (has('algaecide') && wet && w.heat && before.A > 45 && !fountain && w.roll < 0.6) kill = true;
  if (kill) {
    s.fish = clamp(s.fish - 30, 0, 100); s.fishKills++; spend += 1500;
    events.push({ k: 'fishkill', t: 'Fish kill. Dead fish floated up overnight. Cleanup cost $1,500.' });
  } else {
    s.fish = clamp(s.fish + (s.A < 40 ? 6 : 0) - (s.A > 55 ? 6 : 0), 0, 100);
  }

  // Flooding
  const clogNow = has('outlet') ? 0 : prev.clog;
  s.clog = clamp(s.clog + 0.12 * w.mult * l2.outlet.clogRate + (w.storm ? 0.15 * l2.outlet.clogRate : 0) + (w.windDamage ? 0.2 : 0), 0, 1);
  const predrain = has('predrain') && wet ? 12 : 0;
  const capacity = vol * 100 + 15 - 30 * clogNow - 20 * s.sed + l2.outlet.capacityAdj + predrain;
  const stormDepth = (w.stormDepth ?? (w.big ? 88 : w.storm ? 68 : wet ? 40 : 15)) - l2.gardens.peakCut;
  const stagePct = Math.round(100 * stormDepth / Math.max(1, capacity));
  let homes = 0;
  if (stormDepth > capacity) {
    homes = Math.max(1, Math.round((stormDepth - capacity) / 4));
    s.flooded += homes; spend += homes * 3000;
    events.push({ k: 'flood', t: `The pond overflowed. Water reached ${homes} ${homes === 1 ? 'yard and garage' : 'yards and garages'}. Repairs cost $${(homes * 3000).toLocaleString('en-US')}.` });
  }

  // Money
  s.cash = s.cash + DUES - spend;
  let assessment = false;
  if (s.cash < 0) { assessment = true; s.assessments++; events.push({ k: 'assessment', t: 'The pond fund ran dry. The board had to bill every homeowner a special assessment.' }); }

  // Looks and neighbors
  const looks = clamp(0.45 * (100 - s.A) + 0.25 * s.fish + 28 + looksEdge + (fountain ? 8 : 0) - s.weeds * 0.3, 0, 100);
  s.mood = clamp(0.5 * s.mood + 0.5 * looks - homes * 8 - (assessment ? 15 : 0) - (kill ? 10 : 0), 0, 100);

  // Why did that happen?
  const dA = s.A - before.A;
  if (has('algaecide')) why.push('The algaecide cleared the water fast, but dead algae released their nutrients back into the pond. They will feed the next bloom.');
  else if (dA > 10) why.push(`Algae grew because the water carried a lot of nutrients${w.heat ? ' and the summer was hot' : ''}. Most come from lawn fertilizer and grass clippings.`);
  else if (dA < -8) why.push('The water cleared up. Fewer nutrients reached the pond, so algae had less to feed on.');
  if (has('predrain') && wet) why.push('Lowering the pond before the rain gave it more room to hold storm water.');
  if (has('dredge')) why.push('Dredging brought back depth the silt had taken.');
  if (w.windDamage) why.push('Hurricane winds tore up plants along the shelf and jammed the outlet with debris.');
  if (has('buffer')) why.push('The tall grass strip slowed runoff and caught fertilizer before it reached the water.');
  if (has('mow')) why.push('Mowing to the edge looked neat, but nothing stopped fertilizer and clippings from washing straight in.');
  if (has('flyer') && s.outreach >= 0.5) why.push('More neighbors are skipping summer fertilizer. That keeps paying off every season.');
  if (homes > 0) why.push(clogNow > 0.35 ? `The outlet pipe was about ${Math.round(prev.clog * 100)}% clogged with debris, so water backed up instead of draining.` : 'The storm brought more water than the pond could hold.');
  else if (w.storm) why.push(`The pond held ${w.rain} inches of rain without flooding anyone.`);
  if (kill) why.push(fountain ? 'Algae used up the oxygen overnight.' : 'Warm water holds little oxygen, and decaying algae used up the rest overnight. A fountain or fewer nutrients would help.');
  if (d.trap === 1 && s.trapFill >= 0.6) why.push('The sediment trap is full. Sand and silt are now filling the pond itself.');
  if (s.sed > 0.3) why.push(`Silt has filled about ${Math.round(s.sed * 100)}% of the pond's depth, so it holds and cleans less water.`);
  if (w.drought) why.push('Drought dropped the water level. The same nutrients in less water made the pond greener.');
  if (s.weeds > 45) why.push('Nuisance weeds are spreading along the shore.');

  const report: SeasonReport = {
    w, picks, spend, before,
    after: { A: s.A, N: s.N, fish: s.fish, mood: s.mood, cash: s.cash },
    events, why: why.slice(0, 4), homes, kill, removal, exported, looks,
    stormDepth, capacity, stagePct,
  };
  s.history.push({ A: s.A, N: s.N, mood: s.mood, cash: s.cash, exported, removal, rain: w.rain, homes, looks, stage: stagePct, spend });
  s.season++;
  return { state: s, report };
}
