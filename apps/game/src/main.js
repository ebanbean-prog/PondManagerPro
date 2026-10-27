import * as POND from '@pond-steward/engine';
import './style.css';

(() => {
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const money = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

const app = {
  phase: 'intro',
  seed: 1000 + Math.floor(Math.random() * 9000),
  design: { size: 1, plants: 1, trap: 0, fountain: 0 },
  state: null, picks: [], report: null, flooded: new Set(), lastEdge: null
};

/* ---------- scene geometry ---------- */
const BLOB = 'M118 112 C 140 80, 210 78, 252 92 C 296 106, 312 128, 306 156 C 300 190, 262 210, 214 212 C 160 214, 112 204, 98 178 C 86 156, 100 128, 118 112 Z';
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
  const fund = s ? s.cash : POND.BUDGET - POND.designCost(app.design);
  const clarity = 100 - A;
  $('#meters').innerHTML =
    meter('Water clarity', Math.round(clarity), clarity, '/100', r ? dlt(r.before.A - r.after.A) : '') +
    meter('Fish', Math.round(fish), fish, '/100', r ? dlt(r.after.fish - r.before.fish) : '') +
    meter('Neighbors', moodWord(mood), mood, '', r ? dlt(r.after.mood - r.before.mood) : '') +
    meter('Pond fund', money(fund), fund >= 15000 ? 80 : fund >= 6000 ? 50 : fund >= 0 ? 25 : 3, '', r ? dlt(r.after.cash - r.before.cash, true) : '');
}
function renderWhen() {
  const s = app.state;
  if (!s || app.phase === 'intro' || app.phase === 'design') { $('#when').innerHTML = app.phase === 'design' ? 'Design phase · build budget $50,000' : '5 years · 10 seasons'; return; }
  const i = Math.min(app.phase === 'result' ? s.season - 1 : s.season, 9);
  const w = s.weather[i];
  let dots = '';
  for (let k = 0; k < 10; k++) dots += `<i class="${k % 2 === 0 ? 'wet ' : ''}${k < i ? 'done' : k === i ? 'now' : ''}" title="${k % 2 === 0 ? 'Wet' : 'Dry'} season, year ${Math.floor(k / 2) + 1}"></i>`;
  $('#when').innerHTML = app.phase === 'end' ? `Five years complete <span class="dots">${dots.replace(/now/g, 'done')}</span>` : `Year ${w.year} of 5 · ${w.season === 'wet' ? 'Wet season, Jun–Oct' : 'Dry season, Nov–May'} <span class="dots" aria-hidden="true">${dots}</span>`;
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
  <div class="btnrow"><button class="btn" id="go">Design your pond</button></div>`;
}

function designPanel() {
  const D = POND.DESIGN, d = app.design, cost = POND.designCost(d), left = POND.BUDGET - cost;
  const grp = (key, title) => `<div class="group"><div class="gh"><b>${title}</b></div><div class="opts">${D[key].map(o =>
    `<button class="opt" data-k="${key}" data-v="${o.id}" aria-pressed="${d[key] === o.id}"><span class="n">${o.name}</span><span class="c">${o.cost ? money(o.cost) : 'Free'}</span><span class="d">${o.note}</span></button>`).join('')}</div></div>`;
  return `<span class="eyebrow">Step 1 of 2 · Design</span>
  <h2>Build your pond</h2>
  <p class="hint">Money you don't spend now goes into the pond fund for upkeep and emergencies.</p>
  ${grp('size', 'Pond size')}${grp('plants', 'Plants along the edge')}${grp('trap', 'Sediment trap at the inlet')}${grp('fountain', 'Fountain')}
  <div class="budget"><div class="row"><span>Build cost</span><span class="${left < 0 ? 'over' : ''}">${money(cost)} of ${money(POND.BUDGET)}</span></div>
  <div class="bar"><span class="${left < 0 ? 'low' : left < 8000 ? 'mid' : ''}" style="width:${Math.min(100, cost / POND.BUDGET * 100)}%"></span></div>
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
  const cost = app.picks.reduce((t, id) => t + POND.ACTIONS.find(a => a.id === id).cost, 0) + (app.design.fountain ? POND.FOUNTAIN_POWER : 0);
  const cards = POND.ACTIONS.map(a => {
    const off = a.needs === 'trap' && !app.design.trap;
    const on = app.picks.includes(a.id);
    const full = !on && app.picks.length >= 2;
    return `<button class="opt" data-act="${a.id}" aria-pressed="${on}" ${off || full ? 'disabled' : ''}><span class="tag">${a.tag}</span><span class="n">${a.name}</span><span class="c">${a.cost ? money(a.cost) : 'Free'}</span><span class="d">${off ? 'Needs a sediment trap.' : a.text}</span></button>`;
  }).join('');
  return `<span class="eyebrow">Step 2 of 2 · Season ${s.season + 1} of 10</span>
  <h2>Plan the ${w.season === 'wet' ? 'wet' : 'dry'} season</h2>
  <div class="forecast ${f.alert ? 'alert' : ''}"><span class="ic">${f.ic}</span><span><b>${f.b}</b><span>${f.t}</span></span></div>
  <div class="group"><div class="gh"><b>Choose up to 2 actions</b><span class="hint">${app.picks.length}/2 picked</span></div><div class="opts">${cards}</div></div>
  <div class="budget"><div class="row"><span>This season's costs${app.design.fountain ? ' (incl. $500 fountain power)' : ''}</span><span>${money(cost)}</span></div><div class="row"><span>Dues coming in</span><span>${money(POND.DUES)}</span></div></div>
  <div class="btnrow"><button class="btn" id="run">Run the season</button><span class="hint">Doing nothing is allowed. It's free, for now.</span></div>`;
}

function resultPanel() {
  const r = app.report, w = r.w, s = app.state;
  const kindName = { hurricane: 'Hurricane season', tropical: 'Tropical storm', drought: 'Drought', typical: w.season === 'wet' ? 'Typical wet season' : 'Typical dry season' }[w.kind];
  const ev = r.events.map(e => `<div class="event ${['flood', 'fishkill', 'assessment'].includes(e.k) ? 'bad' : ''}">${e.t}</div>`).join('');
  const good = !r.events.some(e => ['flood', 'fishkill', 'assessment'].includes(e.k)) && w.storm ? `<div class="event ok">The pond handled the storm. No homes flooded.</div>` : '';
  const last = s.season >= POND.SEASONS;
  return `<span class="eyebrow">Season ${s.season} of 10 · results</span>
  <h2>${kindName}: <span class="rain">${w.rain} in</span> of rain${w.heat ? ', hot summer' : ''}</h2>
  ${ev || good ? `<div class="events">${ev}${good}</div>` : ''}
  <div class="whybox"><h3>Why did that happen?</h3><ul class="why">${r.why.length ? r.why.map(t => `<li>${t}</li>`).join('') : '<li>A quiet season. The pond settled out runoff as designed.</li>'}</ul></div>
  <p class="hint">You spent ${money(r.spend)} this season and collected ${money(POND.DUES)} in dues.</p>
  <div class="btnrow"><button class="btn" id="next">${last ? 'See your five-year results' : 'Plan the next season'}</button></div>`;
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
function endPanel() {
  const s = app.state, sc = POND.score(s);
  const stars = n => `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map(i => STAR(i <= n)).join('')}</span>`;
  if (sc.unlocked) store.set('pond-l2', '1');
  const missing = [];
  if (!sc.flood) missing.push(`No flooded homes (${s.flooded} flooded). Keep the outlet clear before storm season, or build more storage.`);
  if (sc.wq < 2) missing.push('Two stars for clean water. Cut nutrients at the source: no-mow strips, edge plants, fertilizer outreach.');
  if (sc.looks < 2) missing.push('Two stars for neighbors. Clear water and healthy fish matter more than a perfectly mowed edge.');
  if (sc.cost < 2) missing.push(s.assessments ? 'Two stars for the fund. You ran out of money and billed neighbors. Quick fixes add up.' : 'Two stars for the fund. End with at least $9,000 in the pond fund.');
  return `<span class="eyebrow">Five-year report · weather code ${app.seed}</span>
  <h2>${sc.unlocked ? 'Your pond is thriving.' : 'Your pond made it through five years.'}</h2>
  <div class="scores">
    <div class="score"><span class="s-l"><b>Clean water</b><span>Average clarity ${Math.round(100 - sc.avgA)}/100</span></span>${stars(sc.wq)}</div>
    <div class="score"><span class="s-l"><b>Happy neighbors</b><span>Mostly ${moodWord(sc.avgMood).toLowerCase()}</span></span>${stars(sc.looks)}</div>
    <div class="score"><span class="s-l"><b>Pond fund</b><span>${money(s.cash)} left${s.assessments ? ` · ${s.assessments} special assessment${s.assessments > 1 ? 's' : ''}` : ''}</span></span>${stars(sc.cost)}</div>
    <div class="score"><span class="s-l"><b>Flood protection</b><span>${s.flooded ? s.flooded + ' homes flooded' : 'Every home stayed dry'}</span></span><span class="pass ${sc.flood ? 'y' : 'n'}">${sc.flood ? 'Passed' : 'Failed'}</span></div>
  </div>
  <div><span class="eyebrow">Water clarity, season by season</span>${sparkline(s.history)}</div>
  ${sc.unlocked
    ? `<div class="unlock"><h3>Level 2 unlocked: Pond Manager</h3><p>Real numbers this time. Set pond depth and outlet size, add rain gardens upstream, run a yearly budget, and read rainfall and water-level graphs. Pass the Hurricane Year challenge to reach Level 3: Pond Engineer.</p><div class="btnrow"><button class="btn" disabled>Play Level 2 (in the full game)</button></div></div>`
    : `<div class="unlock locked"><h3>Level 2: Pond Manager is locked</h3><p>To unlock it, you still need:</p><ul>${missing.map(m => `<li>${m}</li>`).join('')}</ul></div>`}
  <div class="btnrow"><button class="btn" id="again">Play again with new weather</button><button class="btn ghost" id="same">Replay code ${app.seed}</button></div>`;
}

/* ---------- flow ---------- */
function render() {
  const P = { intro: introPanel, design: designPanel, plan: planPanel, result: resultPanel, end: endPanel }[app.phase];
  $('#panel').innerHTML = P();
  renderMeters(); renderWhen(); drawScene();
  bind();
}
function bind() {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('go', () => { const v = parseInt(($('#seedIn') || {}).value, 10); if (v > 0) app.seed = v; app.phase = 'design'; render(); top(); });
  on('back', () => { app.phase = 'intro'; render(); });
  document.querySelectorAll('.opt[data-k]').forEach(b => b.addEventListener('click', () => { app.design[b.dataset.k] = +b.dataset.v; render(); }));
  on('build', () => { start(); });
  document.querySelectorAll('.opt[data-act]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.act, i = app.picks.indexOf(id);
    if (i >= 0) app.picks.splice(i, 1);
    else {
      if (id === 'mow') app.picks = app.picks.filter(p => p !== 'buffer');
      if (id === 'buffer') app.picks = app.picks.filter(p => p !== 'mow');
      if (app.picks.length < 2) app.picks.push(id);
    }
    render();
  }));
  on('run', runSeason);
  on('next', () => { app.phase = app.state.season >= POND.SEASONS ? 'end' : 'plan'; app.picks = []; render(); top(); });
  on('again', () => { app.seed = 1000 + Math.floor(Math.random() * 9000); restart(); });
  on('same', restart);
}
function top() { if (window.matchMedia('(max-width: 820px)').matches) document.querySelector('.scene').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function start() { app.state = POND.newGame({ ...app.design }, app.seed); app.flooded = new Set(); app.lastEdge = null; app.picks = []; app.phase = 'plan'; render(); }
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
if (store.get('pond-l2')) $('#lvl').textContent = 'Level 1 · Level 2 unlocked';
render();
})();
