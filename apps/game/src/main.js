import * as POND from '@pond-steward/engine';
import './style.css';

(() => {
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const money = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

const HY = 'hurricane-year';
const L1_DESIGN = () => ({ size: 1, plants: 1, trap: 0, fountain: 0 });
const L2_DESIGN = () => ({ size: 1, plants: 1, trap: 0, fountain: 0, depth: 1, outlet: 1, rainGardens: 0 });
const app = {
  phase: 'intro',
  level: 1,            // 1 = Pond Steward, 2 = Pond Manager
  mode: 'game',        // 'game' (five-year game) or 'hurricane' (Level 2 challenge)
  seed: 1000 + Math.floor(Math.random() * 9000),
  design: L1_DESIGN(),
  state: null, picks: [], report: null, flooded: new Set(), lastEdge: null
};
const maxPicks = () => POND.MAX_PICKS[app.level];
const budget = () => (app.mode === 'hurricane' ? POND.SCENARIOS.challenges[HY].budget : POND.BUDGET);
const actionList = () => (app.level === 2 ? POND.ALL_ACTIONS : POND.ACTIONS);
const seasonCount = () => (app.state ? app.state.weather.length : POND.SEASONS);
const levelLabel = () => app.level === 2 ? 'Level 2 · Pond Manager' : (store.get('pond-l2') ? 'Level 1 · Level 2 unlocked' : 'Level 1 · Heron Lake HOA');

/* ---------- scene geometry ---------- */
const BLOB = 'M118 112 C 140 80, 210 78, 252 92 C 296 106, 312 128, 306 156 C 300 190, 262 210, 214 212 C 160 214, 112 204, 98 178 C 86 156, 100 128, 118 112 Z';
const GARDEN_SPOTS = [[70, 100], [200, 70], [290, 80], [340, 150], [330, 215], [110, 225]];
const HOUSES = [[36, 70], [96, 52], [156, 46], [252, 46], [312, 54], [356, 96], [356, 206], [300, 236], [138, 238]];
function seeded(n) { let a = n; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; }
function buildStatic() {
  const h = $('#houses');
  HOUSES.forEach(([x, y], i) => {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<rect x="${x - 14}" y="${y - 10}" width="28" height="22" rx="2" fill="var(--house)" stroke="var(--line)"/><path d="M${x - 17} ${y - 8} L${x} ${y - 21} L${x + 17} ${y - 8} Z" fill="var(--roof)"/><ellipse class="puddle" cx="${x}" cy="${y + 17}" rx="20" ry="6" fill="var(--water-clear)" opacity="0"/>`;
    g.dataset.i = i; h.appendChild(g);
  });
  const r = seeded(7), al = $('#algae');
  for (let i = 0; i < 26; i++) {
    const e = document.createElementNS(NS, 'ellipse');
    e.setAttribute('cx', 120 + r() * 180); e.setAttribute('cy', 100 + r() * 105);
    e.setAttribute('rx', 6 + r() * 14); e.setAttribute('ry', 3 + r() * 6);
    e.setAttribute('fill', 'var(--water-algae)'); e.dataset.t = (i / 26).toFixed(3);
    al.appendChild(e);
  }
  const rain = $('#rain');
  for (let i = 0; i < 70; i++) {
    const l = document.createElementNS(NS, 'line');
    const x = r() * 420, y = r() * 260;
    l.setAttribute('x1', x); l.setAttribute('y1', y); l.setAttribute('x2', x - 4); l.setAttribute('y2', y + 12);
    l.style.animationDelay = (r() * 0.7).toFixed(2) + 's'; l.dataset.t = (i / 70).toFixed(3);
    rain.appendChild(l);
  }
  ['#water', '#shelf', '#buffer', '#pondClipPath'].forEach(s => $(s).setAttribute('d', BLOB));
}
function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function drawScene() {
  const d = app.design, s = app.state;
  const A = s ? s.A : 22, fish = s ? s.fish : 70, weeds = s ? s.weeds : 10, sed = s ? s.sed : 0, clog = s ? s.clog : 0.1;
  const plants = s ? s.plants : POND.DESIGN.plants[d.plants].p;
  const k = [0.82, 0.92, 1.0][d.size];
  $('#swell').setAttribute('transform', `translate(205 150) scale(${k}) translate(-205 -150)`);
  $('#pondClipPath').setAttribute('transform', '');
  // water colour from algae and silt
  let c = mix(css('--water-clear'), css('--water-algae'), Math.min(1, A / 75));
  c = mix(c, css('--water-murky'), Math.min(0.6, sed * 1.2));
  $('#water').style.fill = c;
  $('#silt').setAttribute('opacity', Math.min(0.55, sed * 1.4).toFixed(2));
  // algae mats
  document.querySelectorAll('#algae ellipse').forEach(e => { e.setAttribute('opacity', (+e.dataset.t < A / 85 ? 0.75 : 0)); });
  // shelf and buffer
  $('#shelf').setAttribute('stroke-width', (plants * 22).toFixed(1));
  $('#shelf').setAttribute('opacity', plants > 0.02 ? 1 : 0);
  const buf = app.lastEdge === 'buffer';
  $('#buffer').setAttribute('stroke-width', buf ? 46 : 0);
  $('#buffer').setAttribute('opacity', buf ? 0.9 : 0);
  // flowers along the shelf
  const fl = $('#flowers'); fl.innerHTML = '';
  const path = $('#shelf'), len = path.getTotalLength(), n = Math.round(plants * 22);
  for (let i = 0; i < n; i++) {
    const p = path.getPointAtLength((i / n) * len + 7);
    const o = (i % 2 ? 1 : -1) * plants * 5;
    const cEl = document.createElementNS(NS, 'circle');
    cEl.setAttribute('cx', p.x + o * 0.4); cEl.setAttribute('cy', p.y + o * 0.6); cEl.setAttribute('r', 2.2);
    cEl.setAttribute('fill', 'var(--flower)'); fl.appendChild(cEl);
  }
  // weeds
  const wd = $('#weeds'); wd.innerHTML = '';
  const nw = Math.round(weeds / 10);
  for (let i = 0; i < nw; i++) {
    const p = path.getPointAtLength(((i * 0.137 + 0.05) % 1) * len);
    const g = document.createElementNS(NS, 'path');
    g.setAttribute('d', `M${p.x} ${p.y} l-4 -9 M${p.x} ${p.y} l0 -11 M${p.x} ${p.y} l4 -9`);
    g.setAttribute('stroke', 'var(--marsh)'); g.setAttribute('stroke-width', 2); g.setAttribute('stroke-linecap', 'round');
    wd.appendChild(g);
  }
  // fish
  const fs = $('#fishes'); fs.innerHTML = '';
  const nf = Math.round(fish / 17);
  const spots = [[170, 130], [240, 160], [200, 185], [260, 120], [150, 165], [225, 110]];
  for (let i = 0; i < nf; i++) {
    const [x, y] = spots[i];
    const g = document.createElementNS(NS, 'path');
    g.setAttribute('d', `M${x} ${y} q8 -5 14 0 q-6 5 -14 0 Z M${x} ${y} l-5 -4 v8 Z`);
    g.setAttribute('fill', '#ffffff'); g.setAttribute('opacity', 0.55); g.setAttribute('class', 'fish');
    g.style.animationDelay = (i * 0.9) + 's'; fs.appendChild(g);
  }
  $('#fountain').setAttribute('opacity', d.fountain ? 1 : 0);
  $('#trap').setAttribute('opacity', d.trap ? 1 : 0);
  const trapFull = s && s.trapFill >= 0.6;
  $('#trap').setAttribute('fill', trapFull ? 'var(--warn)' : 'var(--sand)');
  $('#outlet').setAttribute('fill', clog > 0.55 ? 'var(--bad)' : clog > 0.3 ? 'var(--warn)' : 'var(--surface)');
  // Level 2: rain gardens between the street and the pond, and the outlet pipe size
  const gardens = $('#gardens'); gardens.innerHTML = '';
  const nG = (d.rainGardens || 0) * 2;
  for (let i = 0; i < nG; i++) {
    const [gx, gy] = GARDEN_SPOTS[i];
    const e = document.createElementNS(NS, 'ellipse');
    e.setAttribute('cx', gx); e.setAttribute('cy', gy); e.setAttribute('rx', 11); e.setAttribute('ry', 6);
    e.setAttribute('fill', 'var(--marsh)'); e.setAttribute('stroke', 'var(--flower)'); e.setAttribute('stroke-width', 1.5);
    gardens.appendChild(e);
  }
  const ow = [14, 18, 24][d.outlet === undefined ? 1 : d.outlet];
  $('#outlet').setAttribute('width', ow); $('#outlet').setAttribute('x', 324 - ow);
  document.querySelectorAll('#houses g').forEach(g => g.querySelector('.puddle').setAttribute('opacity', app.flooded.has(+g.dataset.i) ? 0.8 : 0));
}

/* ---------- meters & header ---------- */
function meter(label, val, pct, unit, delta) {
  const cls = pct >= 60 ? '' : pct >= 40 ? 'mid' : 'low';
  return `<div class="meter"><span class="lab">${label}</span><span class="val">${val}${unit ? `<small>${unit}</small>` : ''}</span><div class="bar"><span class="${cls}" style="width:${Math.max(3, Math.min(100, pct))}%"></span></div>${delta || '<span class="delta">&nbsp;</span>'}</div>`;
}
function dlt(v, money_) {
  if (v === undefined || Math.abs(v) < (money_ ? 1 : 1)) return '<span class="delta">no change</span>';
  const up = v > 0;
  return `<span class="delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${money_ ? money(Math.abs(v)).replace('−', '') : Math.round(Math.abs(v))}</span>`;
}
function moodWord(m) { return m >= 70 ? 'Pleased' : m >= 55 ? 'Content' : m >= 40 ? 'Grumbling' : 'Upset'; }
function renderMeters() {
  const s = app.state, r = app.phase === 'result' ? app.report : null;
  const A = s ? s.A : 22, fish = s ? s.fish : 70, mood = s ? s.mood : 70;
  const fund = s ? s.cash : budget() - POND.designCost(app.design);
  const clarity = 100 - A;
  const l2 = app.level === 2;
  $('#meters').innerHTML =
    meter('Water clarity', Math.round(clarity), clarity, '/100', r ? dlt(r.before.A - r.after.A) : '') +
    meter('Fish', Math.round(fish), fish, '/100', r ? dlt(r.after.fish - r.before.fish) : '') +
    meter('Neighbors', l2 ? Math.round(mood) : moodWord(mood), mood, l2 ? '/100' : '', r ? dlt(r.after.mood - r.before.mood) : '') +
    meter('Pond fund', money(fund), fund >= 15000 ? 80 : fund >= 6000 ? 50 : fund >= 0 ? 25 : 3, '', r ? dlt(r.after.cash - r.before.cash, true) : '') +
    (l2 ? level2Meters(s, r) : '');
}
/* Level 2 shows the hidden numbers too. For these, lower is better, so the bar shows how much room is left. */
function level2Meters(s, r) {
  const N = s ? s.N : 28, sed = s ? s.sed : 0, clog = s ? s.clog : 0.1;
  const plants = s ? s.plants : POND.DESIGN.plants[app.design.plants].p;
  return meter('Nutrients', Math.round(N), 100 - N, '/100', r ? dlt(r.before.N - r.after.N) : '') +
    meter('Silt in pond', Math.round(sed * 100), 100 - sed * 100, '%', '') +
    meter('Outlet clogged', Math.round(clog * 100), 100 - clog * 100, '%', r ? dlt((r.before.clog - clog) * 100) : '') +
    meter('Plant shelf', Math.round(plants * 100), plants * 100, '%', '');
}
function renderWhen() {
  const s = app.state;
  const hy = app.level === 2 && app.mode === 'hurricane';
  if (!s || app.phase === 'intro' || app.phase === 'design') { $('#when').innerHTML = app.phase === 'design' ? `Design phase · build budget ${money(budget())}` : (hy ? '2 years · 4 seasons' : '5 years · 10 seasons'); return; }
  const n = s.weather.length, years = n / 2;
  const i = Math.min(app.phase === 'result' ? s.season - 1 : s.season, n - 1);
  const w = s.weather[i];
  let dots = '';
  for (let k = 0; k < n; k++) dots += `<i class="${k % 2 === 0 ? 'wet ' : ''}${k < i ? 'done' : k === i ? 'now' : ''}" title="${k % 2 === 0 ? 'Wet' : 'Dry'} season, year ${Math.floor(k / 2) + 1}"></i>`;
  $('#when').innerHTML = app.phase === 'end' ? `${hy ? 'Challenge complete' : 'Five years complete'} <span class="dots">${dots.replace(/now/g, 'done')}</span>` : `Year ${w.year} of ${years} · ${w.season === 'wet' ? 'Wet season, Jun–Oct' : 'Dry season, Nov–May'} <span class="dots" aria-hidden="true">${dots}</span>`;
}

/* ---------- panels ---------- */
const STAR = f => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3L2.8 9.5l6.4-.8z" fill="${f ? 'var(--accent)' : 'none'}" stroke="${f ? 'var(--accent)' : 'var(--muted)'}" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
const ICON = {
  water: '<svg viewBox="0 0 28 28"><path d="M14 4c4 6 7 9.5 7 13a7 7 0 0 1-14 0c0-3.5 3-7 7-13z" fill="var(--water-clear)"/></svg>',
  people: '<svg viewBox="0 0 28 28"><circle cx="10" cy="10" r="4" fill="var(--accent)"/><circle cx="19" cy="11" r="3.3" fill="var(--accent)" opacity=".6"/><path d="M3 23c1-5 4-7 7-7s6 2 7 7z" fill="var(--accent)"/><path d="M15 23c.6-4 2.4-5.6 4.4-5.6S23.4 19 24.4 23z" fill="var(--accent)" opacity=".6"/></svg>',
  coin: '<svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="9" fill="none" stroke="var(--warn)" stroke-width="2.2"/><path d="M14 9v10M11.5 11.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-linecap="round"/></svg>',
  house: '<svg viewBox="0 0 28 28"><path d="M5 13l9-8 9 8v10H5z" fill="none" stroke="var(--bad)" stroke-width="2" stroke-linejoin="round"/><path d="M3 23c3-2 5 2 8 0s5 2 8 0 5 2 7 0" fill="none" stroke="var(--water-clear)" stroke-width="2"/></svg>',
  storm: '<svg viewBox="0 0 34 34"><path d="M9 20a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 0 10z" fill="var(--muted)"/><path d="M13 23l-2 6M19 23l-2 6M25 23l-2 6" stroke="var(--water-clear)" stroke-width="2.2" stroke-linecap="round"/></svg>',
  sun: '<svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="6" fill="var(--warn)"/><g stroke="var(--warn)" stroke-width="2" stroke-linecap="round"><path d="M17 4v4M17 26v4M4 17h4M26 17h4M8 8l3 3M23 23l3 3M8 26l3-3M23 11l3-3"/></g></svg>'
};

function introPanel() {
  return `<span class="eyebrow">Heron Lake HOA · 120 homes · Central Florida</span>
  <h2>You run the pond committee. Keep the pond healthy for five years.</h2>
  <p>Every street, roof and lawn in the neighborhood drains to one stormwater pond. It holds back floodwater and cleans runoff before it flows downstream. First you design it, then you care for it season by season.</p>
  <ul class="goals">
    <li>${ICON.water}<span><b>Clean water.</b> Keep algae down and nutrients from building up.</span></li>
    <li>${ICON.people}<span><b>Happy neighbors.</b> People want a pond that looks good and has fish.</span></li>
    <li>${ICON.coin}<span><b>A healthy pond fund.</b> Neighbors pay $1,500 a season. Don't run out.</span></li>
    <li>${ICON.house}<span><b>No flooded homes.</b> A big storm is coming at some point. Be ready.</span></li>
  </ul>
  <p class="hint">Earn at least two stars on every goal without flooding anyone to unlock Level 2: Pond Manager.</p>
  <div class="code"><label for="seedIn">Weather code</label><input id="seedIn" inputmode="numeric" maxlength="4" value="${app.seed}"><span>Share a code so a whole group plays the same weather.</span></div>
  <div class="btnrow"><button class="btn" id="go">Design your pond</button>${store.get('pond-l2') ? '<button class="btn ghost" id="to2">Play Level 2: Pond Manager</button>' : ''}</div>`;
}

function introPanel2() {
  const hy = POND.SCENARIOS.challenges[HY];
  return `<span class="eyebrow">Level 2 · Pond Manager · Heron Lake HOA</span>
  <h2>Now you run the numbers.</h2>
  <p>Same pond, deeper decisions. Set the pond depth and outlet size, add rain gardens upstream, and work to a yearly budget. You will see the hidden numbers behind each season, plus graphs of rain and how close the pond came to overflowing.</p>
  <ul class="goals">
    <li>${ICON.water}<span><b>Depth and outlet.</b> A deeper pond and a larger outlet hold more storm water, but each has a catch.</span></li>
    <li>${ICON.house}<span><b>Rain gardens.</b> Soak up runoff before it reaches the pond. They cost more than they look.</span></li>
    <li>${ICON.coin}<span><b>A yearly budget of ${money(POND.ANNUAL_BUDGET)}.</b> Up to ${POND.MAX_PICKS[2]} actions a season, three of them new.</span></li>
  </ul>
  <div class="code"><label for="seedIn">Weather code</label><input id="seedIn" inputmode="numeric" maxlength="4" value="${app.seed}"><span>Share a code so a whole group plays the same weather.</span></div>
  <div class="group"><div class="gh"><b>Choose your game</b></div><div class="opts">
    <button class="opt" id="mode-game"><span class="n">Five-year game</span><span class="d">Ten seasons of typical Florida weather. Earn stars on every goal.</span></button>
    <button class="opt" id="mode-hurricane"><span class="n">${hy.name} challenge</span><span class="d">Four seasons with a hurricane in year 2. No flooding, no fish kill, within budget. Pass it to unlock Level 3.</span></button>
  </div></div>
  <div class="btnrow"><button class="btn ghost" id="to1">Back to Level 1</button></div>`;
}

function designPanel() {
  const l2 = app.level === 2;
  const D = POND.DESIGN, d = app.design, cost = POND.designCost(d), total = budget(), left = total - cost;
  const costTag = c => c < 0 ? `Saves ${money(-c)}` : c ? money(c) : 'Free';
  const grp = (key, title, src = D) => `<div class="group"><div class="gh"><b>${title}</b></div><div class="opts">${src[key].map(o =>
    `<button class="opt" data-k="${key}" data-v="${o.id}" aria-pressed="${d[key] === o.id}"><span class="n">${o.name}</span><span class="c">${costTag(o.cost)}</span><span class="d">${o.note}</span></button>`).join('')}</div></div>`;
  return `<span class="eyebrow">Step 1 of 2 · Design</span>
  <h2>Build your pond</h2>
  <p class="hint">Money you don't spend now goes into the pond fund for upkeep and emergencies.</p>
  ${grp('size', 'Pond size')}${l2 ? grp('depth', 'Pond depth', POND.DESIGN_L2) : ''}${grp('plants', 'Plants along the edge')}${l2 ? grp('outlet', 'Outlet size', POND.DESIGN_L2) : ''}${l2 ? grp('rainGardens', 'Rain gardens upstream', POND.DESIGN_L2) : ''}${grp('trap', 'Sediment trap at the inlet')}${grp('fountain', 'Fountain')}
  <div class="budget"><div class="row"><span>Build cost</span><span class="${left < 0 ? 'over' : ''}">${money(cost)} of ${money(total)}</span></div>
  <div class="bar"><span class="${left < 0 ? 'low' : left < 8000 ? 'mid' : ''}" style="width:${Math.min(100, cost / total * 100)}%"></span></div>
  <div class="row"><span>Starts the pond fund</span><span class="${left < 0 ? 'over' : ''}">${left < 0 ? 'Over budget by ' + money(-left) : money(left)}</span></div></div>
  <div class="btnrow"><button class="btn" id="build" ${left < 0 ? 'disabled' : ''}>Build it and start year 1</button><button class="btn ghost" id="back">Back</button></div>`;
}

function forecast(w) {
  if (w.season === 'wet') {
    if (w.kind === 'hurricane') return { alert: true, ic: ICON.storm, b: 'Forecasters are tracking a hurricane', t: 'Heavy rain likely this summer. Is your outlet clear?' };
    if (w.kind === 'tropical') return { alert: true, ic: ICON.storm, b: 'A tropical storm is possible', t: 'Expect several inches of rain in a couple of days.' };
    return { ic: ICON.storm, b: 'Rainy season', t: 'Afternoon storms most days. Typical total: 26 to 34 inches.' };
  }
  if (w.kind === 'drought') return { alert: true, ic: ICON.sun, b: 'Drier than normal outlook', t: 'Water levels may drop.' };
  return { ic: ICON.sun, b: 'Dry season', t: 'Cooler and drier. Typical total: 10 to 16 inches.' };
}
function planPanel() {
  const s = app.state, w = s.weather[s.season], f = forecast(w);
  const l2 = app.level === 2, cap = maxPicks(), n = s.weather.length;
  const cost = app.picks.reduce((t, id) => t + POND.ALL_ACTIONS.find(a => a.id === id).cost, 0) + (app.design.fountain ? POND.FOUNTAIN_POWER : 0);
  const cards = actionList().map(a => {
    const off = a.needs === 'trap' && !app.design.trap;
    const on = app.picks.includes(a.id);
    const full = !on && app.picks.length >= cap;
    return `<button class="opt" data-act="${a.id}" aria-pressed="${on}" ${off || full ? 'disabled' : ''}><span class="tag">${a.tag}</span><span class="n">${a.name}</span><span class="c">${a.cost ? money(a.cost) : 'Free'}</span><span class="d">${off ? 'Needs a sediment trap.' : a.text}</span></button>`;
  }).join('');
  const yearSoFar = s.season % 2 === 1 ? (s.history[s.season - 1] || {}).spend || 0 : 0;
  const yearCap = app.mode === 'hurricane' ? POND.SCENARIOS.challenges[HY].annualBudget : POND.ANNUAL_BUDGET;
  const yearTotal = yearSoFar + cost, over = yearTotal > yearCap;
  const yearBlock = l2 ? `<div class="budget"><div class="row"><span>Spending this year${s.season % 2 === 1 ? ' (incl. last season)' : ''}</span><span class="${over ? 'over' : ''}">${money(yearTotal)} of ${money(yearCap)}</span></div>
  <div class="bar"><span class="${over ? 'low' : yearTotal > yearCap * 0.8 ? 'mid' : ''}" style="width:${Math.min(100, yearTotal / yearCap * 100)}%"></span></div>
  ${over ? `<div class="row"><span class="over">Over the yearly budget by ${money(yearTotal - yearCap)}.</span></div>` : ''}</div>` : '';
  return `<span class="eyebrow">Step 2 of 2 · Season ${s.season + 1} of ${n}</span>
  <h2>Plan the ${w.season === 'wet' ? 'wet' : 'dry'} season</h2>
  <div class="forecast ${f.alert ? 'alert' : ''}"><span class="ic">${f.ic}</span><span><b>${f.b}</b><span>${f.t}${l2 ? ` Forecast: about ${w.rain} inches.` : ''}</span></span></div>
  <div class="group"><div class="gh"><b>Choose up to ${cap} actions</b><span class="hint">${app.picks.length}/${cap} picked</span></div><div class="opts">${cards}</div></div>
  <div class="budget"><div class="row"><span>This season's costs${app.design.fountain ? ' (incl. $500 fountain power)' : ''}</span><span>${money(cost)}</span></div><div class="row"><span>Dues coming in</span><span>${money(POND.DUES)}</span></div></div>
  ${yearBlock}${l2 && s.history.length ? graphs(s) : ''}
  <div class="btnrow"><button class="btn" id="run">Run the season</button><span class="hint">Doing nothing is allowed. It's free, for now.</span></div>`;
}

function resultPanel() {
  const r = app.report, w = r.w, s = app.state;
  const kindName = { hurricane: 'Hurricane season', tropical: 'Tropical storm', drought: 'Drought', typical: w.season === 'wet' ? 'Typical wet season' : 'Typical dry season' }[w.kind];
  const ev = r.events.map(e => `<div class="event ${['flood', 'fishkill', 'assessment'].includes(e.k) ? 'bad' : ''}">${e.t}</div>`).join('');
  const good = !r.events.some(e => ['flood', 'fishkill', 'assessment'].includes(e.k)) && w.storm ? `<div class="event ok">The pond handled the storm. No homes flooded.</div>` : '';
  const n = s.weather.length, last = s.season >= n, l2 = app.level === 2;
  return `<span class="eyebrow">Season ${s.season} of ${n} · results</span>
  <h2>${kindName}: <span class="rain">${w.rain} in</span> of rain${w.heat ? ', hot summer' : ''}</h2>
  ${ev || good ? `<div class="events">${ev}${good}</div>` : ''}
  <div class="whybox"><h3>Why did that happen?</h3><ul class="why">${r.why.length ? r.why.map(t => `<li>${t}</li>`).join('') : '<li>A quiet season. The pond settled out runoff as designed.</li>'}</ul></div>
  ${l2 ? `<p class="hint">The pond reached ${r.stagePct}% of what it can hold${r.stagePct > 100 ? ', so it overflowed' : ''}.</p>` : ''}
  <p class="hint">You spent ${money(r.spend)} this season and collected ${money(POND.DUES)} in dues.</p>
  ${l2 ? graphs(s) : ''}
  <div class="btnrow"><button class="btn" id="next">${last ? (app.mode === 'hurricane' ? 'See your challenge results' : 'See your five-year results') : 'Plan the next season'}</button></div>`;
}

function sparkline(hist) {
  const W = 320, H = 92, pl = 30, pr = 8, pt = 10, pb = 22;
  const x = i => pl + i * (W - pl - pr) / (hist.length - 1), y = v => pt + (1 - v / 100) * (H - pt - pb);
  const pts = hist.map((h, i) => `${x(i).toFixed(1)},${y(100 - h.A).toFixed(1)}`).join(' ');
  const grid = [0, 50, 100].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="var(--muted)" font-family="var(--f-mono)">${v}</text>`).join('');
  const yrs = [0, 2, 4, 6, 8].map((i, k) => `<text x="${(x(i) + x(i + 1)) / 2}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="var(--f-mono)">Y${k + 1}</text>`).join('');
  const lastI = hist.length - 1;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Water clarity over ten seasons">${grid}${yrs}<polygon points="${x(0)},${y(0)} ${pts} ${x(lastI)},${y(0)}" fill="var(--water-clear)" opacity=".15"/><polyline points="${pts}" fill="none" stroke="var(--water-clear)" stroke-width="2"/><circle cx="${x(lastI)}" cy="${y(100 - hist[lastI].A)}" r="3.5" fill="var(--water-clear)"/></svg>`;
}
const AX = 'font-size="9" fill="var(--muted)" font-family="var(--f-mono)"';
function seasonLabels(n, x, H) {
  let out = '';
  for (let i = 0; i < n; i++) out += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" ${AX}>${i % 2 === 0 ? 'W' : 'D'}${Math.floor(i / 2) + 1}</text>`;
  return out;
}
function rainChart(s, upcoming) {
  const n = s.weather.length, W = 320, H = 110, pl = 30, pr = 8, pt = 10, pb = 22;
  const vals = s.history.map(h => h.rain);
  const maxV = Math.max(20, ...vals, upcoming || 0);
  const slot = (W - pl - pr) / n, x = i => pl + slot * (i + 0.5), y = v => pt + (1 - v / maxV) * (H - pt - pb);
  const grid = [0, maxV / 2, maxV].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end" ${AX}>${Math.round(v)}</text>`).join('');
  const bars = vals.map((v, i) => `<rect x="${x(i) - slot * 0.35}" y="${y(v)}" width="${slot * 0.7}" height="${y(0) - y(v)}" rx="2" fill="var(--water-clear)"/>`).join('');
  const next = upcoming ? `<rect x="${x(vals.length) - slot * 0.35}" y="${y(upcoming)}" width="${slot * 0.7}" height="${y(0) - y(upcoming)}" rx="2" fill="none" stroke="var(--water-clear)" stroke-dasharray="3 2"/>` : '';
  return `<div class="chart"><span class="eyebrow">Rain each season (inches)${upcoming ? ' · dashed bar is the forecast' : ''}</span><svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rain each season in inches: ${vals.join(', ')}${upcoming ? '. Forecast for the coming season: ' + upcoming : ''}">${grid}${bars}${next}${seasonLabels(n, x, H)}</svg></div>`;
}
function stageChart(s) {
  const n = s.weather.length, W = 320, H = 110, pl = 30, pr = 8, pt = 10, pb = 22;
  const vals = s.history.map(h => h.stage);
  const maxV = Math.max(120, ...vals);
  const slot = (W - pl - pr) / n, x = i => pl + slot * (i + 0.5), y = v => pt + (1 - v / maxV) * (H - pt - pb);
  const grid = [0, 50].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end" ${AX}>${v}</text>`).join('');
  const limit = `<line x1="${pl}" x2="${W - pr}" y1="${y(100)}" y2="${y(100)}" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="${pl - 6}" y="${y(100) + 3}" text-anchor="end" ${AX}>100</text>`;
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const dots = vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${v > 100 ? 'var(--bad)' : 'var(--water-clear)'}"/>`).join('');
  return `<div class="chart"><span class="eyebrow">How full the pond got in the worst storm (%)</span><svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Peak pond level each season as a percent of capacity: ${vals.join(', ')}. Above 100 means the pond overflowed.">${grid}${limit}${vals.length > 1 ? `<polyline points="${pts}" fill="none" stroke="var(--water-clear)" stroke-width="2"/>` : ''}${dots}${seasonLabels(n, x, H)}</svg><span class="hint">Above the red line, the pond overflows into yards.</span></div>`;
}
function graphs(s) {
  const upcoming = app.phase === 'plan' && !POND.isFinished(s) ? s.weather[s.season].rain : null;
  return `<div class="charts">${rainChart(s, upcoming)}${stageChart(s)}</div>`;
}

function scoreRows(s, sc) {
  const stars = n => `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map(i => STAR(i <= n)).join('')}</span>`;
  return `<div class="scores">
    <div class="score"><span class="s-l"><b>Clean water</b><span>Average clarity ${Math.round(100 - sc.avgA)}/100</span></span>${stars(sc.wq)}</div>
    <div class="score"><span class="s-l"><b>Happy neighbors</b><span>Mostly ${moodWord(sc.avgMood).toLowerCase()}</span></span>${stars(sc.looks)}</div>
    <div class="score"><span class="s-l"><b>Pond fund</b><span>${money(s.cash)} left${s.assessments ? ` · ${s.assessments} special assessment${s.assessments > 1 ? 's' : ''}` : ''}</span></span>${stars(sc.cost)}</div>
    <div class="score"><span class="s-l"><b>Flood protection</b><span>${s.flooded ? s.flooded + ' homes flooded' : 'Every home stayed dry'}</span></span><span class="pass ${sc.flood ? 'y' : 'n'}">${sc.flood ? 'Passed' : 'Failed'}</span></div>
  </div>`;
}
function yearSpends(s) {
  const out = [];
  for (let i = 0; i < s.history.length; i += 2) out.push(s.history[i].spend + (s.history[i + 1] ? s.history[i + 1].spend : 0));
  return out;
}
function endPanel2() {
  const s = app.state, sc = POND.score(s);
  const years = yearSpends(s), within = years.filter(v => v <= POND.ANNUAL_BUDGET).length;
  return `<span class="eyebrow">Level 2 report · weather code ${app.seed}</span>
  <h2>${sc.unlocked ? 'A well-managed pond.' : 'Your pond made it through five years.'}</h2>
  ${scoreRows(s, sc)}
  <div class="score"><span class="s-l"><b>Yearly budget</b><span>${within} of ${years.length} years within ${money(POND.ANNUAL_BUDGET)} · spent ${years.map(money).join(', ')}</span></span><span class="pass ${within === years.length ? 'y' : 'n'}">${within === years.length ? 'On budget' : 'Over'}</span></div>
  <div><span class="eyebrow">Water clarity, season by season</span>${sparkline(s.history)}</div>
  ${graphs(s)}
  <div class="unlock"><h3>Ready for Hurricane Year?</h3><p>Four seasons, one hurricane, no second chances: no flooding, no fish kill, and every year within budget. Pass it to unlock Level 3: Pond Engineer.</p><div class="btnrow"><button class="btn" id="to-hy">Take the Hurricane Year challenge</button></div></div>
  <div class="btnrow"><button class="btn ghost" id="again">Play again with new weather</button><button class="btn ghost" id="same">Replay code ${app.seed}</button></div>`;
}
function endPanelHurricane() {
  const s = app.state, c = POND.scoreChallenge(s), cap = POND.SCENARIOS.challenges[HY].annualBudget;
  const years = yearSpends(s);
  if (c.passed) store.set('pond-l3', '1');
  const row = (title, detail, ok) => `<div class="score"><span class="s-l"><b>${title}</b><span>${detail}</span></span><span class="pass ${ok ? 'y' : 'n'}">${ok ? 'Passed' : 'Failed'}</span></div>`;
  const repairs = !c.noFlood || !c.noFishKill;
  const tips = [];
  if (!c.noFlood) tips.push('The hurricane brought more water than the pond could hold. Lower the pond before the storm, clear the outlet, or build more storage (a larger outlet, more depth, or rain gardens).');
  if (!c.noFishKill) tips.push('Fish died when warm water ran low on oxygen. Fewer nutrients or a fountain would help.');
  if (!c.withinBudget && !repairs) tips.push(`A year went over ${money(cap)}. Plan the two seasons of a year together.`);
  if (s.assessments) tips.push('The fund ran dry and neighbors were billed. Keep some money in reserve.');
  return `<span class="eyebrow">${POND.SCENARIOS.challenges[HY].name} · weather code ${app.seed}</span>
  <h2>${c.passed ? 'You weathered the hurricane.' : 'The hurricane got the better of the pond.'}</h2>
  <div class="scores">
    ${row('No flooding', s.flooded ? `${s.flooded} home${s.flooded > 1 ? 's' : ''} flooded` : 'Every home stayed dry', c.noFlood)}
    ${row('No fish kill', s.fishKills ? `${s.fishKills} fish kill${s.fishKills > 1 ? 's' : ''}` : 'The fish survived', c.noFishKill)}
    ${row('Within budget', `Spent ${years.map(money).join(' and ')} against ${money(cap)} a year${repairs ? ' (includes repairs and cleanup)' : ''}`, c.withinBudget)}
  </div>
  ${graphs(s)}
  ${c.passed
    ? `<div class="unlock"><h3>Level 3 unlocked: Pond Engineer</h3><p>Level 3 is still being built. Your unlock is saved on this device.</p></div>`
    : `<div class="unlock locked"><h3>Level 3: Pond Engineer is locked</h3><p>To unlock it, you still need:</p><ul>${tips.map(m => `<li>${m}</li>`).join('')}</ul></div>`}
  <div class="btnrow"><button class="btn" id="again">Try again with new weather</button><button class="btn ghost" id="same">Replay code ${app.seed}</button><button class="btn ghost" id="to2">Redesign in Level 2</button></div>`;
}

function endPanel() {
  if (app.level === 2) return app.mode === 'hurricane' ? endPanelHurricane() : endPanel2();
  const s = app.state, sc = POND.score(s);
  if (sc.unlocked) store.set('pond-l2', '1');
  const missing = [];
  if (!sc.flood) missing.push(`No flooded homes (${s.flooded} flooded). Keep the outlet clear before storm season, or build more storage.`);
  if (sc.wq < 2) missing.push('Two stars for clean water. Cut nutrients at the source: no-mow strips, edge plants, fertilizer outreach.');
  if (sc.looks < 2) missing.push('Two stars for neighbors. Clear water and healthy fish matter more than a perfectly mowed edge.');
  if (sc.cost < 2) missing.push(s.assessments ? 'Two stars for the fund. You ran out of money and billed neighbors. Quick fixes add up.' : 'Two stars for the fund. End with at least $9,000 in the pond fund.');
  return `<span class="eyebrow">Five-year report · weather code ${app.seed}</span>
  <h2>${sc.unlocked ? 'Your pond is thriving.' : 'Your pond made it through five years.'}</h2>
  ${scoreRows(s, sc)}
  <div><span class="eyebrow">Water clarity, season by season</span>${sparkline(s.history)}</div>
  ${sc.unlocked
    ? `<div class="unlock"><h3>Level 2 unlocked: Pond Manager</h3><p>Real numbers this time. Set pond depth and outlet size, add rain gardens upstream, run a yearly budget, and read rainfall and water-level graphs. Pass the Hurricane Year challenge to reach Level 3: Pond Engineer.</p><div class="btnrow"><button class="btn" id="to2">Play Level 2</button></div></div>`
    : `<div class="unlock locked"><h3>Level 2: Pond Manager is locked</h3><p>To unlock it, you still need:</p><ul>${missing.map(m => `<li>${m}</li>`).join('')}</ul></div>`}
  <div class="btnrow"><button class="btn" id="again">Play again with new weather</button><button class="btn ghost" id="same">Replay code ${app.seed}</button></div>`;
}

/* ---------- flow ---------- */
function render() {
  const P = { intro: app.level === 2 ? introPanel2 : introPanel, design: designPanel, plan: planPanel, result: resultPanel, end: endPanel }[app.phase];
  $('#panel').innerHTML = P();
  $('#lvl').textContent = levelLabel();
  renderMeters(); renderWhen(); drawScene();
  bind();
}
function bind() {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  const readSeed = () => { const v = parseInt(($('#seedIn') || {}).value, 10); if (v > 0) app.seed = v; };
  const enter = (level, mode) => { app.level = level; app.mode = mode; app.design = level === 2 ? L2_DESIGN() : L1_DESIGN(); app.state = null; app.picks = []; app.flooded = new Set(); app.lastEdge = null; app.phase = 'intro'; render(); top(); };
  on('go', () => { readSeed(); app.phase = 'design'; render(); top(); });
  on('to2', () => enter(2, 'game'));
  on('to1', () => enter(1, 'game'));
  on('mode-game', () => { readSeed(); app.mode = 'game'; app.phase = 'design'; render(); top(); });
  on('mode-hurricane', () => { readSeed(); app.mode = 'hurricane'; app.phase = 'design'; render(); top(); });
  on('to-hy', () => { app.mode = 'hurricane'; app.state = null; app.picks = []; app.flooded = new Set(); app.lastEdge = null; app.phase = 'design'; render(); top(); });
  on('back', () => { app.phase = 'intro'; render(); });
  document.querySelectorAll('.opt[data-k]').forEach(b => b.addEventListener('click', () => { app.design[b.dataset.k] = +b.dataset.v; render(); }));
  on('build', () => { start(); });
  document.querySelectorAll('.opt[data-act]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.act, i = app.picks.indexOf(id);
    if (i >= 0) app.picks.splice(i, 1);
    else {
      if (id === 'mow') app.picks = app.picks.filter(p => p !== 'buffer');
      if (id === 'buffer') app.picks = app.picks.filter(p => p !== 'mow');
      if (app.picks.length < maxPicks()) app.picks.push(id);
    }
    render();
  }));
  on('run', runSeason);
  on('next', () => { app.phase = POND.isFinished(app.state) ? 'end' : 'plan'; app.picks = []; render(); top(); });
  on('again', () => { app.seed = 1000 + Math.floor(Math.random() * 9000); restart(); });
  on('same', restart);
}
function top() { if (window.matchMedia('(max-width: 820px)').matches) document.querySelector('.scene').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function start() { app.state = POND.newGame({ ...app.design }, app.seed, app.mode === 'hurricane' ? { scenario: HY } : {}); app.flooded = new Set(); app.lastEdge = null; app.picks = []; app.phase = 'plan'; render(); }
function restart() { app.phase = 'design'; app.state = null; app.flooded = new Set(); app.lastEdge = null; render(); top(); }
function runSeason() {
  const btn = $('#run'); if (btn) btn.disabled = true;
  const w = app.state.weather[app.state.season];
  const out = POND.runSeason(app.state, app.picks.slice());
  const scene = $('#scene');
  const density = Math.min(1, w.rain / 44);
  document.querySelectorAll('#rain line').forEach(l => { l.style.visibility = +l.dataset.t < density ? 'visible' : 'hidden'; });
  scene.classList.add('raining');
  if (!w.storm) $('#swell').style.transform = 'none';
  setTimeout(() => {
    scene.classList.remove('raining'); $('#swell').style.transform = '';
    if (app.picks.includes('mow')) app.lastEdge = 'mow'; else if (app.picks.includes('buffer')) app.lastEdge = 'buffer'; else app.lastEdge = null;
    app.state = out.state; app.report = out.report;
    if (out.report.homes) { const order = [8, 7, 6, 0, 5, 1, 4, 2, 3]; let n = out.report.homes; for (const i of order) { if (n <= 0) break; if (!app.flooded.has(i)) { app.flooded.add(i); n--; } } }
    app.phase = 'result'; render(); top();
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1700);
}

buildStatic();
render();
})();
