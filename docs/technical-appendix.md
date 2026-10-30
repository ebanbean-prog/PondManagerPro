# Technical appendix: model equations

Pond Steward simulation engine, `packages/engine`. Content values live in `packages/content`.

**Status: draft, not verified.** Every equation and coefficient below is a plausible placeholder chosen to make the game teach the right lessons. None is calibrated against field data, published removal curves or a hydraulic model. Eban Bean verifies all model content before it is treated as anything more than a game rule.

**AI disclosure.** This appendix was drafted by Claude (Sonnet 5.5) on 2026-10-30 by reading the engine source and content JSON. No unpublished data was used. Sources for each coefficient are blank on purpose: the "Source" column says what is needed, and nothing here cites a reference the author has not checked.

How to use this file: read each section, compare it to the code, and replace "Placeholder" in the Source column with a citation or a reason as you verify each item. The "Review" column flags the items most likely to be wrong or misleading.

---

## 1. Conventions

- Time step: one season. Wet season is Jun to Oct and dry season is Nov to May, so a game year is two seasons. The five-year game has 10 seasons.
- Money is in US dollars. Rainfall is in inches.
- **The state variables are indices, not physical quantities.** `N`, `A`, `fish`, `weeds`, `mood` are on a 0 to 100 scale, and `sed`, `clog`, `plants`, `outreach`, `trapFill` are on 0 to 1. `N` is not a concentration in mg/L, and `A` is not chlorophyll-a in ug/L. Level 3 will need real units. See section 9.
- `clamp(v, lo, hi)` is `max(lo, min(hi, v))`.
- The engine is pure and deterministic: `runSeason(state, picks) -> (state', report)`. All randomness comes from a seeded generator (section 4).

## 2. State variables

Initial values are set in `newGame`.

| Symbol | Meaning | Range | Initial | Notes |
| --- | --- | --- | --- | --- |
| `N` | Nutrient level in the pond | 0 to 100 | 28 | Index, lower is better |
| `A` | Algae level | 0 to 100 | 22 | Index. Water clarity shown to players is `100 - A` |
| `fish` | Fish health | 0 to 100 | 70 | |
| `weeds` | Nuisance weeds on the shore | 0 to 100 | 10 | |
| `sed` | Fraction of pond depth filled with silt | 0 to 1 | 0 | Reduces storage and treatment |
| `clog` | Outlet clogging | 0 to 1 | 0.1 | Reduces flood capacity |
| `outreach` | Share of neighbors skipping summer fertilizer | 0 to 1 | 0 | Built up by the fertilizer flyer |
| `trapFill` | Sediment trap fullness | 0 to 1 | 0 | Only used if a trap is built |
| `plants` | Plant shelf health | 0 to 1 | `p` of the built shelf | 0, 0.5 or 1 at build time |
| `mood` | Neighbor satisfaction | 0 to 100 | 70 | Word shown at Level 1: Pleased (70+), Content (55+), Grumbling (40+), Upset |
| `cash` | Pond fund | dollars | budget minus build cost | Can go negative |
| `flooded` | Total homes flooded so far | count | 0 | |
| `assessments` | Seasons the fund ran dry | count | 0 | |
| `fishKills` | Fish kills so far | count | 0 | |

## 3. Constants and design options

### 3.1 Scenario constants (`packages/content/scenario.json`)

| Constant | Value | Meaning | Source |
| --- | --- | --- | --- |
| `budget` | $50,000 | Starting capital for the Level 1 and Level 2 five-year game | Placeholder |
| `dues` | $1,500 per season | Income from homeowners | Placeholder |
| `fountainPower` | $500 per season | Running cost of a fountain | Placeholder |
| `seasons` | 10 | Seasons in the five-year game | Game design |

### 3.2 Level 1 design options (`design.json`)

| Option | Cost | Effect value | Source |
| --- | --- | --- | --- |
| Pond size: Small / Standard / Large | $18,000 / $28,000 / $40,000 | `vol` = 0.6 / 0.8 / 1.0 | Placeholder. Needs real volumes and permit sizing |
| Plants: none / narrow / wide shelf | $0 / $5,000 / $10,000 | `p` = 0 / 0.5 / 1.0 | Placeholder |
| Sediment trap: none / trap | $0 / $8,000 | see E6 | Placeholder |
| Fountain: none / fountain | $0 / $6,000 | see E8, E9, E11, E14 | Placeholder |

### 3.3 Level 2 design options (`design-level2.json`)

Omitting these inputs is the same as the defaults (standard depth, standard outlet, no rain gardens), which reproduces Level 1 exactly.

| Option | Cost | Effect values | Source |
| --- | --- | --- | --- |
| Depth: shallow / standard / deep | -$2,000 / $0 / $6,000 | `volMult` = 0.85 / 1.0 / 1.2. `internalWet` = 0 / 0 / 3 | Placeholder. Deep-pond oxygen penalty is a qualitative idea only |
| Outlet: small / standard / large | -$500 / $0 / $2,500 | `capacityAdj` = -8 / 0 / +8. `removalAdj` = +0.04 / 0 / -0.05. `clogRate` = 1.4 / 1.0 / 0.8 | Placeholder. Needs orifice sizing and residence time |
| Rain gardens: 0 / 2 / 4 / 6 | $0 / $4,000 / $8,000 / $12,000 | `loadCut` = 0 / 0.06 / 0.12 / 0.18. `peakCut` = 0 / 2 / 4 / 6 | Placeholder. Needs BMP removal credits and runoff reduction |

### 3.4 Actions (`actions.json`, `actions-level2.json`)

| Action | Cost | Effect (equation) | Level |
| --- | --- | --- | --- |
| Leave a no-mow strip (`buffer`) | $0 | E3 | 1 |
| Mow to the water (`mow`) | $400 | E3 | 1 |
| Fertilizer flyer (`flyer`) | $400 | E2 | 1 |
| Clear the outlet (`outlet`) | $600 | E2 | 1 |
| Empty the sediment trap (`trapclean`) | $1,200 | E2 | 1 |
| Pull weeds and algae (`harvest`) | $1,800 | E2 | 1 |
| Spray algaecide (`algaecide`) | $1,500 | E10 | 1 |
| Lower the pond before storms (`predrain`) | $800 | E12 | 2 |
| Replant the plant shelf (`replant`) | $1,500 | E2 | 2 |
| Dredge the silt (`dredge`) | $4,000 | E2 | 2 |

Pick limits: 2 per season at Level 1, 5 at Level 2 (`scenarios.json`). The user interface enforces the limit, not the engine. The engine does not check that `trapclean` has a trap to clean either. The user interface hides it.

---

## 4. Weather generation

Weather is a schedule for the whole game, fixed by the seed (the "weather code"), so a group can replay identical conditions. The generator is mulberry32. `makeWeather(seed)` uses `r = rng(seed * 7 + 3)`.

**Event years** (years are indexed 0 to 4):

- Hurricane year `bigYear = 1 + floor(r() * 4)`, so years 2 to 5, never year 1.
- Tropical storm year `tsYear = floor(r() * 5)`. If it equals `bigYear`, use `(tsYear + 2) mod 5`.
- Drought year: with probability 0.6, `floor(r() * 5)`, else none. It affects that year's dry season.

**Each year, in order** (draws happen in this order, so changing it changes every schedule):

| Season | Rain (inches) | Rain multiplier `mult` | Storm flags |
| --- | --- | --- | --- |
| Wet, typical | `round(26 + 8 r)` | 1.0 | none |
| Wet, tropical storm | typical + 8 | 1.3 | `storm` |
| Wet, hurricane | typical + 14 | 1.6 | `storm`, `big` |
| Dry, typical | `round(10 + 6 r)` | 0.45 | none |
| Dry, drought | `round(4 + 2 r)` | 0.2 | `drought` |

Each wet season is also hot with probability 0.45 (`heat`). Dry seasons are never hot.

**Surprises** (one draw per season): 14% grass clippings, 12% construction next door, 74% none. Each season also stores a uniform `roll`, used by the algaecide fish-kill rule (E11).

| Item | Review |
| --- | --- |
| Rain depths and the 26 to 34 inch wet-season range | Compare to a station record for the target region (Central Florida) |
| Event frequencies (one hurricane and one tropical storm in five years) | Game pacing, not climatology. Adjust or document the intent |
| Heat probability 0.45 | Placeholder |

### Challenge weather (`makeChallengeWeather`)

Hurricane Year is a fixed four-season schedule in `scenarios.json` (wet typical, dry typical, wet hurricane, dry typical). The seed `rng(seed * 11 + 5)` only varies details: for each season it draws heat (wet seasons only), a rain jitter and `roll`, then, for the hurricane season, a storm depth jitter. The hurricane season has `stormDepth` 100 plus a 0 to 8 jitter, and `windDamage`.

---

## 5. Season equations

`runSeason` evaluates these in order. Let `w` be this season's weather, `wet = (w.season == 'wet')`, `fountain` be true if a fountain was built, and `vol` be defined in E1. "This season's picks" are the actions chosen.

### E1. Pond storage index

`vol = size.vol * depth.volMult`

`size.vol` is 0.6, 0.8 or 1.0 and `depth.volMult` is 0.85, 1.0 or 1.2. Default depth leaves `vol` unchanged.

### E2. Start-of-season actions

| Action | Effect |
| --- | --- |
| `flyer` | `outreach = clamp(outreach + 0.25, 0, 1)` |
| `outlet` | `clog = 0` |
| `trapclean` | `trapFill = 0` |
| `harvest` | `weeds -= 25`, `N -= 6`, `A -= 10` (each clamped to 0 to 100) |
| `dredge` | `sed = clamp(sed - 0.3, 0, 1)` |
| `replant` | `plants = clamp(plants + 0.15, 0, plantShelf)` where `plantShelf` is the built shelf `p` |
| Wind damage (hurricane challenge only) | `plants = clamp(plants - 0.2, 0, 1)` |

### E3. Edge management

| Pick | Edge factor | Looks adjustment | Plants |
| --- | --- | --- | --- |
| `mow` | 1.2 | +10 | `plants = clamp(plants - 0.12, 0, 1)` |
| `buffer` | 0.82 | -5 | `plants = clamp(plants + 0.04, 0, plantShelf + 0.1)` |
| neither | 1.0 | 0 | unchanged |

If both are picked, `mow` wins in the engine. The Level 1 and 2 user interface prevents picking both.

### E4. Watershed nutrient load

```
load = 40 * w.mult * (1 - 0.4 * outreach) * edge
load = load * (1 - gardens.loadCut)
if surprise == 'clippings':     load += (buffer ? 3 : 9)
if surprise == 'construction':  load += 6
```

| Term | Review |
| --- | --- |
| Base load 40 | An index, not a mass. Replace with an event-mean-concentration times runoff volume calculation (section 9) |
| Outreach reduces load by up to 40% | Placeholder. Needs a basis for fertilizer behavior change |
| Rain gardens reduce load by 6% each pair, up to 18% | Placeholder. Needs a BMP removal credit |

### E5. Sediment input

```
sedIn = 0.04 * w.mult
if surprise == 'construction': sedIn += 0.12
```

### E6. Sediment trap (if built)

```
working = (trapFill < 0.6)
load  *= (working ? 0.75 : 0.95)
sedIn *= (working ? 0.3  : 0.9)
trapFill = clamp(trapFill + 0.12 * w.mult + (construction ? 0.2 : 0), 0, 1)
```

Then `sed = clamp(sed + sedIn, 0, 1)`. A working trap removes 25% of the load and 70% of the sediment. A full trap removes 5% and 10%.

### E7. Treatment (nutrient removal)

```
effVol  = vol * (1 - 0.5 * sed)
removal = clamp(0.25 + 0.4 * effVol + 0.25 * plants + outlet.removalAdj, 0, 0.88)
```

Silt halves effective volume at most. Removal rises with volume and plants and is capped at 88%.

| Term | Review |
| --- | --- |
| Whole equation | **Highest priority to calibrate.** CLAUDE.md targets Florida wet detention removal versus residence time. Replace with a residence-time-based relationship, with `vol` and the outlet determining residence time |
| 0.88 cap | Placeholder |

### E8. Internal loading and exported load

```
internal = 0
if wet and A > 60 and not fountain:  internal += 6
if w.drought:                        internal += 6
if wet and not fountain:             internal += depth.internalWet
exported = load * (1 - removal)
N = clamp(0.5 * N + exported + internal, 0, 100)
```

The pond keeps half its nutrient level each season (`0.5 * N`). The `A > 60` test uses algae from the start of this season, before E9 updates it.

### E9. Algae

```
target = N * 2.0 * (wet ? 1 : 0.6) * (w.heat ? 1.25 : 1) * (w.drought ? 1.3 : 1)
         - plants * 15 - (fountain ? 10 : 0)
A = clamp(0.5 * A + 0.5 * target, 0, 100)
```

Algae relaxes halfway toward a target set by nutrients, season, heat and drought. Plants and a fountain reduce the target. This is a stand-in for a chlorophyll-a response.

### E10. Algaecide

```
if algaecide:  A = clamp(0.35 * A, 0, 100);  N = clamp(N + 8, 0, 100)
```

Algae drop by 65% but nutrients rise by 8 as dead algae release them. This is the "pretty but harmful" lesson.

### E11. Weeds, oxygen and fish

```
weeds = clamp(weeds + (N > 30 ? 8 : 3) - plants * 3, 0, 100)

kill = false
if wet and not fountain and (A > 62 or (w.heat and A > 48)):         kill = true
if algaecide and wet and w.heat and A_before > 45 and not fountain
   and w.roll < 0.6:                                                 kill = true

if kill:  fish = clamp(fish - 30, 0, 100);  fishKills += 1;  spend += 1500
else:     fish = clamp(fish + (A < 40 ? 6 : 0) - (A > 55 ? 6 : 0), 0, 100)
```

`A_before` is algae at the start of the season. No dissolved oxygen is simulated. A high-algae, hot, fountain-free wet season triggers a kill by rule. **Review:** replace with a DO or temperature-based criterion at Level 3.

### E12. Outlet clogging and flood check

```
clogNow  = (outlet picked) ? 0 : clog_at_start
clog     = clamp(clog + 0.12 * w.mult * outlet.clogRate
                 + (w.storm ? 0.15 * outlet.clogRate : 0)
                 + (w.windDamage ? 0.2 : 0), 0, 1)

predrain = (predrain picked and wet) ? 12 : 0
capacity = vol * 100 + 15 - 30 * clogNow - 20 * sed + outlet.capacityAdj + predrain

baseDepth  = w.stormDepth if set, else  (big ? 88 : storm ? 68 : wet ? 40 : 15)
stormDepth = baseDepth - gardens.peakCut
stagePct   = round(100 * stormDepth / max(1, capacity))
```

The check uses the clogging at the start of the season, or zero if the outlet was cleared this season. The season's new clogging only affects later seasons.

If `stormDepth > capacity`: `homes = max(1, round((stormDepth - capacity) / 4))`, `flooded += homes`, and `spend += 3000 * homes`.

| Term | Review |
| --- | --- |
| **Capacity and storm depth** | **Not hydraulics.** `stormDepth` (15, 40, 68, 88) and `capacity` are hand-tuned numbers on a common index, loosely scaled to inches, with no stage-storage or stage-discharge relationship. CLAUDE.md calls for a cross-check against a SWMM model of the same pond. This is the largest gap between the game and a real pond |
| 4 stage units per home flooded, $3,000 per home | Placeholder |

### E13. Money

```
cash = cash + dues - spend
if cash < 0:  assessments += 1   (special assessment event)
```

`spend` is the cost of the picks, plus fountain power, plus a fish kill cleanup ($1,500) and flood repairs. The fund can go negative. A negative balance at the end of any season counts as one assessment.

### E14. Neighbors

```
looks = clamp(0.45 * (100 - A) + 0.25 * fish + 28 + edgeLooks + (fountain ? 8 : 0) - 0.3 * weeds, 0, 100)
mood  = clamp(0.5 * mood + 0.5 * looks - 8 * homes - (assessment ? 15 : 0) - (kill ? 10 : 0), 0, 100)
```

`edgeLooks` is +10 for mowing and -5 for the no-mow strip. This is the intended tension: neatness raises looks but not water quality.

### E15. Reported water level (Level 2)

`stagePct` from E12 is stored per season (`history[].stage`) and graphed. Above 100 means overflow.

---

## 6. Scoring

### 6.1 Level 1 and Level 2 stars (`score`)

Computed over the full history of the five-year game.

```
avgA, avgN, avgMood = means over all seasons

wq    = 3 if avgA < 30 and avgN < 22
        2 if avgA < 45 and avgN < 30
        1 otherwise
looks = 3 if avgMood >= 68;  2 if avgMood >= 55;  1 otherwise
cost  = 0 if any assessment;  3 if cash >= 20,000;  2 if cash >= 9,000;  1 otherwise
flood = (flooded == 0)

unlocked = flood and wq >= 2 and looks >= 2 and cost >= 2
```

Passing Level 1 unlocks Level 2. Thresholds are the Level 1 balance targets in CLAUDE.md. **Review:** the unlock difficulty is an open question in the development plan.

### 6.2 Hurricane Year (`scoreChallenge`)

Passed when all three hold: `flooded == 0`, `fishKills == 0`, and `withinBudget`.

- `withinBudget` is true when `assessments == 0` and, for each game year (two consecutive seasons), the sum of `spend` is at most the challenge's annual budget ($3,500).
- `spend` includes repairs and cleanup, so a flood or a fish kill can also fail the budget test. The user interface says so on the results screen.
- Passing sets the Level 3 unlock flag on the player's device.

Challenge settings: starting budget $60,000, annual budget $3,500, four seasons, hurricane `stormDepth` 100 to 108.

---

## 7. Level 2 balance targets (provisional)

From `tools/balance`, 200 seeds. See CLAUDE.md for the Level 1 table.

| Hurricane Year strategy | Pass rate |
| --- | --- |
| Small pond, no actions | 0% |
| Mow to the edge plus algaecide | 0% |
| Standard pond, outlet cleared, no pond lowering | 0% |
| Standard pond, outlet cleared, pond lowered before the hurricane | about 57.5% |
| Standard pond plus large outlet and 2 rain gardens | 100% |
| Large pond plus wide shelf, outlet cleared | 100% |

---

## 8. Known simplifications and quirks

These are places where the engine does something a reader might not expect. None is a bug, but each is worth a conscious decision.

1. **Order of evaluation matters.** Internal loading (E8) tests algae from the previous season. The flood check (E12) uses clogging from the start of the season. Swapping the order changes results.
2. **The engine does not enforce pick limits or action prerequisites.** The interface does.
3. **`mow` beats `buffer`** if both are passed to the engine.
4. **Fountain power is charged every season**, including drought, even when it has no effect.
5. **Silt only leaves via `dredge`**, which exists only at Level 2. Nothing else scours the pond, so `sed` rises every season at Level 1. This is what causes the late floods in the Level 1 balance target for the standard pond.
6. **`plants` can fall below the built shelf** (mowing, hurricane wind) and only recover through `buffer` (up to shelf + 0.1) or `replant` (up to the built shelf).
7. **`predrain` only helps in wet seasons**, and has no cost beyond the action fee.
8. **Rain total does not enter the flood check.** Only the season type and storm flags choose `stormDepth`. Rain inches affect only the graphs and the scene animation.
9. **A flood needs at least one home.** `max(1, ...)` means any overflow floods at least one yard.
10. **Weather is a function of the seed only.** Player choices never change the schedule, by design (rule 2 in CLAUDE.md).

---

## 9. Calibration plan and open questions

Targets from CLAUDE.md, with what each would replace. Nothing here has been done.

| Target | Replaces | What is needed |
| --- | --- | --- |
| Long-run nutrient removal matches published Florida wet detention removal versus residence time | E7 | Choose published relationship(s), compute residence time from volume and outlet |
| Runoff loads from Harper / BMPTRAINS event mean concentrations by land use | E4 | Land use mix for the example watershed, runoff coefficients, EMC tables |
| Share BMP and EMC logic with the Florida Stormwater Advisor Tool | E4, E7, rain gardens | Confirm what can be reused rather than duplicated |
| Storm hydraulics cross-checked against a SWMM model of the same pond | E12 | A SWMM model, stage-storage and stage-discharge curves, design storms |
| Real units for Level 3 (loads, concentrations, chlorophyll-a, DO, NPV) | `N`, `A`, E9, E11 | A water-quality state in physical units and a conversion for the lower levels |

**Questions for the model owner**

1. Should Levels 1 and 2 remain index-based, with a mapping to physical units only in Level 3, or should the physical model sit underneath all levels?
2. Should the rain total drive the flood check (a rainfall-to-stage relationship) instead of fixed storm depths?
3. Is it acceptable that silt only leaves through dredging, given that the Level 1 balance targets depend on silt buildup causing late floods?
4. Are the Level 2 option effects (section 3.3) directionally right, even if the magnitudes are not?
5. Hurricane Year starting budget and annual budget: what is a realistic O&M budget for a pond of this size?

## 10. Verification log

Fill in as items are checked.

| Section | Verified by | Date | Notes |
| --- | --- | --- | --- |
| 3. Constants and options | | | |
| 4. Weather | | | |
| 5. E1 to E15 | | | |
| 6. Scoring | | | |
