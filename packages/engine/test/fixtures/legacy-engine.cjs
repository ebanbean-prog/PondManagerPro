// ===== Pond engine: pure, seeded, no DOM =====
const POND = (() => {
  const DESIGN = {
    size: [
      { id: 0, name: 'Small', cost: 18000, vol: 0.6, note: 'Cheapest. Water passes through fast.' },
      { id: 1, name: 'Standard', cost: 28000, vol: 0.8, note: 'Meets the typical permit size.' },
      { id: 2, name: 'Large', cost: 40000, vol: 1.0, note: 'Holds more storm water and settles more.' }
    ],
    plants: [
      { id: 0, name: 'No edge plants', cost: 0, p: 0, note: 'Grass down to the water.' },
      { id: 1, name: 'Narrow plant shelf', cost: 5000, p: 0.5, note: 'A strip of native plants.' },
      { id: 2, name: 'Wide plant shelf', cost: 10000, p: 1.0, note: 'Pickerelweed, rushes, cordgrass.' }
    ],
    trap: [
      { id: 0, name: 'No sediment trap', cost: 0, note: 'Sand and silt go straight in.' },
      { id: 1, name: 'Sediment trap', cost: 8000, note: 'Catches sand at the inlet. Needs cleaning.' }
    ],
    fountain: [
      { id: 0, name: 'No fountain', cost: 0, note: 'Quiet water.' },
      { id: 1, name: 'Fountain', cost: 6000, note: 'Adds oxygen. $500 a season to run.' }
    ]
  };
  const BUDGET = 50000, DUES = 1500, FOUNTAIN_POWER = 500, SEASONS = 10;

  const ACTIONS = [
    { id: 'buffer', name: 'Leave a no-mow strip', cost: 0, tag: 'Edge', text: 'Let grass grow tall along the water.' },
    { id: 'mow', name: 'Mow to the water', cost: 400, tag: 'Edge', text: 'Neat and tidy, right to the edge.' },
    { id: 'flyer', name: 'Fertilizer flyer', cost: 400, tag: 'Neighbors', text: 'Ask neighbors to skip summer fertilizer.' },
    { id: 'outlet', name: 'Clear the outlet', cost: 600, tag: 'Upkeep', text: 'Pull debris from the overflow pipe.' },
    { id: 'trapclean', name: 'Empty the sediment trap', cost: 1200, tag: 'Upkeep', text: 'Dig out the sand it caught.', needs: 'trap' },
    { id: 'harvest', name: 'Pull weeds and algae', cost: 1800, tag: 'Water', text: 'Rake out mats and weeds by hand.' },
    { id: 'algaecide', name: 'Spray algaecide', cost: 1500, tag: 'Water', text: 'Clears green water fast.' }
  ];

  function rngFrom(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Weather schedule for the whole game, fixed by seed (same seed = same weather for a workshop)
  function makeWeather(seed) {
    const r = rngFrom(seed * 7 + 3);
    const list = [];
    const bigYear = 1 + Math.floor(r() * 4); // a hurricane in year 2-5
    let tsYear = Math.floor(r() * 5); if (tsYear === bigYear) tsYear = (tsYear + 2) % 5;
    const droughtYear = r() < 0.6 ? Math.floor(r() * 5) : -1;
    for (let y = 0; y < 5; y++) {
      // wet season Jun-Oct
      const heat = r() < 0.45;
      let w = { season: 'wet', year: y + 1, kind: 'typical', rain: Math.round(26 + r() * 8), mult: 1.0, storm: false, big: false, heat };
      if (y === bigYear) w = { ...w, kind: 'hurricane', rain: w.rain + 14, mult: 1.6, storm: true, big: true };
      else if (y === tsYear) w = { ...w, kind: 'tropical', rain: w.rain + 8, mult: 1.3, storm: true };
      list.push(w);
      // dry season Nov-May
      let d = { season: 'dry', year: y + 1, kind: 'typical', rain: Math.round(10 + r() * 6), mult: 0.45, storm: false, big: false, heat: false };
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

  function newGame(design, seed) {
    const cost = designCost(design);
    return {
      seed, design, season: 0,
      weather: makeWeather(seed),
      cash: BUDGET - cost,
      N: 28, A: 22, fish: 70, weeds: 10, sed: 0, clog: 0.1, outreach: 0, trapFill: 0,
      plants: DESIGN.plants[design.plants].p,
      mood: 70, flooded: 0, assessments: 0, fishKills: 0,
      history: []
    };
  }
  function designCost(d) {
    return DESIGN.size[d.size].cost + DESIGN.plants[d.plants].cost + DESIGN.trap[d.trap].cost + DESIGN.fountain[d.fountain].cost;
  }

  // Run one season. Returns a new state and a report. picks = array of action ids (max 2).
  function runSeason(prev, picks) {
    const s = JSON.parse(JSON.stringify(prev));
    const w = s.weather[s.season];
    const d = s.design;
    const has = id => picks.includes(id);
    const wet = w.season === 'wet';
    const vol = DESIGN.size[d.size].vol;
    const fountain = d.fountain === 1;
    const before = { A: s.A, N: s.N, fish: s.fish, mood: s.mood, cash: s.cash, clog: s.clog };
    const why = [];
    const events = [];
    let spend = 0;

    for (const id of picks) spend += ACTIONS.find(a => a.id === id).cost;
    if (fountain) spend += FOUNTAIN_POWER;

    // Actions that happen at the start of the season
    if (has('flyer')) s.outreach = clamp(s.outreach + 0.25, 0, 1);
    if (has('outlet')) s.clog = 0;
    if (has('trapclean')) s.trapFill = 0;
    if (has('harvest')) { s.weeds = clamp(s.weeds - 25, 0, 100); s.N = clamp(s.N - 6, 0, 100); s.A = clamp(s.A - 10, 0, 100); }

    let edge = 1, looksEdge = 0;
    if (has('mow')) { edge = 1.2; looksEdge = 10; s.plants = clamp(s.plants - 0.12, 0, 1); }
    else if (has('buffer')) { edge = 0.82; looksEdge = -5; s.plants = clamp(s.plants + 0.04, 0, DESIGN.plants[d.plants].p + 0.1); }

    // Watershed load
    let load = 40 * w.mult * (1 - 0.4 * s.outreach) * edge;
    if (w.surprise === 'clippings') { load += has('buffer') ? 3 : 9; events.push({ k: 'clippings', t: has('buffer') ? 'A neighbor blew grass clippings toward the pond. Your no-mow strip caught most of them.' : 'A neighbor blew grass clippings into the pond. They rot and feed algae.' }); }
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
    const removal = clamp(0.25 + 0.4 * effVol + 0.25 * s.plants, 0, 0.88);
    let internal = 0;
    if (wet && s.A > 60 && !fountain) internal += 6;
    if (w.drought) internal += 6;
    const exported = load * (1 - removal);
    s.N = clamp(s.N * 0.5 + exported + internal, 0, 100);

    // Algae
    let target = s.N * 2.0 * (wet ? 1 : 0.6) * (w.heat ? 1.25 : 1) * (w.drought ? 1.3 : 1) - s.plants * 15 - (fountain ? 10 : 0);
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
    s.clog = clamp(s.clog + 0.12 * w.mult + (w.storm ? 0.15 : 0), 0, 1);
    const capacity = vol * 100 + 15 - 30 * clogNow - 20 * s.sed;
    const stormDepth = w.big ? 88 : w.storm ? 68 : wet ? 40 : 15;
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

    const report = { w, picks, spend, before, after: { A: s.A, N: s.N, fish: s.fish, mood: s.mood, cash: s.cash }, events, why: why.slice(0, 4), homes, kill, removal, exported, looks };
    s.history.push({ A: s.A, N: s.N, mood: s.mood, cash: s.cash, exported, removal, rain: w.rain, homes, looks });
    s.season++;
    return { state: s, report };
  }

  function score(s) {
    const h = s.history;
    const avg = k => h.reduce((t, x) => t + x[k], 0) / h.length;
    const avgA = avg('A'), avgExp = avg('exported'), avgMood = avg('mood'), avgN = avg('N');
    const wq = avgA < 30 && avgN < 22 ? 3 : avgA < 45 && avgN < 30 ? 2 : 1;
    const looks = avgMood >= 68 ? 3 : avgMood >= 55 ? 2 : 1;
    const cost = s.assessments > 0 ? 0 : s.cash >= 20000 ? 3 : s.cash >= 9000 ? 2 : 1;
    const flood = s.flooded === 0;
    const unlocked = flood && wq >= 2 && looks >= 2 && cost >= 2;
    return { wq, looks, cost, flood, unlocked, avgA, avgExp, avgMood, avgN };
  }

  return { DESIGN, ACTIONS, BUDGET, DUES, SEASONS, newGame, runSeason, score, designCost };
})();
if (typeof module !== 'undefined') module.exports = POND;
