# Stormwater Pond Game — Development Plan

Oct 25, 2026 · Eban Bean

## Vision and learning objectives

Build a browser-based simulation game for pond managers, HOA boards and the general public in which players design and then care for a neighborhood stormwater pond over several simulated years, balancing water quality, how the pond looks, and cost against variable rainfall and surprise storms. The entry level needs no technical background and works for middle and high school students too; strong performance unlocks progressively more technical levels, up to an Engineer level for professionals. The game should be plausible rather than predictive: it makes real cause-and-effect visible, not engineering design decisions.

After playing, a player should be able to:

1. Explain how pond volume, depth, littoral shelf and outlet design control residence time and pollutant removal.
2. Connect watershed behavior (fertilizer, grass clippings, construction sediment) to pond nutrient loads and algae blooms.
3. Recognize that the cleanest-looking pond is not always the best-functioning pond (for example, herbicide-cleared shorelines that fuel algae).
4. Weigh up-front capital cost against long-term maintenance cost, including deferred dredging.
5. Anticipate how design and maintenance choices hold up under extreme storms and droughts.

Because Level 1 is accessible to students, map these objectives to NGSS engineering and human-impact standards (for example MS-ESS3-3 and HS-ESS3-4) so teachers and 4-H agents can adopt it as a secondary use.

## Audiences and use cases

Design first for non-technical adults who make or influence pond decisions, reached through extension workshops and self-guided online play. Students and technical professionals are served by the same game: students at Level 1, professionals by unlocking or skipping to Level 3.

| Audience | Priority | Setting | Session length | Starting level |
| --- | --- | --- | --- | --- |
| HOA boards, property managers | Primary | Extension workshops, board meetings, online | 20 to 40 min | Level 1 |
| Pond management and lawn care contractors | Primary | Trainings, CEU-style sessions, online | 20 to 40 min | Level 1, quickly to Level 2 |
| General public, residents near ponds | Primary | Outreach events, kiosks, online | 10 to 20 min | Level 1 |
| Middle and high school students | Secondary | Classrooms, 4-H, camps | One class period | Level 1 |
| Engineers, inspectors, regulators, college students | Secondary | Conferences, courses, CEU sessions | 30 to 60 min | Level 3 via unlock or skip-ahead challenge |

## Levels and unlocks

Three levels run the same simulation; they differ in how many decisions players make, how results are shown, and how much of the math is visible. Each level is earned by performance at the one before it.

|  | Level 1: Pond Steward | Level 2: Pond Manager | Level 3: Pond Engineer |
| --- | --- | --- | --- |
| Who it fits | Residents, HOA boards, students | Pond managers, contractors, engaged boards | Engineers, regulators, advanced students |
| Design choices | 4 picture cards: pond size, plants on the edge, trash/sediment trap, fountain | Level 1 choices plus depth, outlet size, upstream rain gardens | Full parameter set: volumes, slopes, orifice and weir sizes, stage-storage |
| Management choices | 3 per season from a hand of cards | 5 to 6 with an annual budget | All actions with a multi-year budget and reserve fund |
| Results shown | Pond look, happy/unhappy neighbors, fish, coins | Meters plus simple graphs of rain and pond water level | Full dashboard: loads, concentrations, chlorophyll-a, DO, NPV |
| Weather | Named storms and dry spells, gentle surprises | Realistic seasons plus one big storm per game | Synthetic rainfall record, return periods, future-climate toggle |
| Explanations | "Why did that happen?" pop-ups in plain language | Short explanations with a key number | Equations and assumptions in an expandable panel |
| Game length | 5 years, about 20 min | 10 years, about 40 min | 10 to 20 years, open-ended |
| To unlock the next level | 2+ stars on all three goals in one game, no flooded homes | Pass the "Hurricane Year" challenge: no flooding, no fish kill, within budget | Top level; ranked challenges and leaderboards |

**How unlocking works**

- Unlocks require balanced performance, not one maxed-out meter, so players must learn the tradeoffs before seeing more detail.
- Each level adds challenge scenarios (Hurricane Year, Drought Summer, Budget Cut, New Construction Upstream) with their own star ratings and badges.
- A skip-ahead challenge lets professionals jump to Level 3 by solving one pond problem, so experts are not forced through the basics.
- Progress is saved on the device by default, with an optional free account to carry it across devices.
- A printable completion certificate per level; explore whether Level 2 or 3 could count toward continuing education credits for pond managers or engineers.

## Core gameplay loop

A game is one design phase followed by repeated wet-season and dry-season cycles over 10 to 20 simulated years, with an optional retrofit decision midway.

1. Pick a scenario (site, budget, goals)
2. Design the pond (capital decisions)
3. Simulate a season (rain, runoff, events)
4. Review the dashboard (water quality, looks, cost)
5. Manage and budget (O&M actions)
6. Years left? Yes: back to step 3 for the next season. No: final debrief with a tradeoff chart.

Surprise and extreme events arrive inside the seasonal simulation, so each round of management decisions is made with the last storm or bloom fresh in mind.

## Player decisions

Every decision should carry a visible cost and at least one hidden or delayed consequence; that tension is what makes it a game. The tables below are the full Level 3 set; Levels 1 and 2 show a subset as plain-language cards (see Levels and unlocks). Design choices are made once at the start; management choices recur each season.

**Design phase (capital budget)**

| Decision | Options | Main tradeoff |
| --- | --- | --- |
| Permanent pool volume | Small / standard / oversized | Residence time and removal vs land and excavation cost |
| Depth profile | Shallow / mixed / deep pockets | Shallow warms and grows algae; very deep can stratify and release P |
| Littoral shelf | None / narrow / wide planted | Nutrient uptake and habitat vs planting and upkeep cost |
| Side slopes | Steep / gentle | Safety, mowing and erosion vs pond footprint |
| Outlet structure | Orifice size, weir height, bleed-down | Flood control vs short-circuiting and drawdown |
| Pretreatment | None / forebay / swales / baffle box | Sediment capture and easier cleanout vs cost |
| Watershed GI retrofits | Rain gardens, tree boxes, pervious areas | Lower loads at the source vs per-unit cost |

**Management phase (annual O&M budget)**

| Decision | Options | Main tradeoff |
| --- | --- | --- |
| Shoreline vegetation | Herbicide / mechanical / leave a no-mow buffer | Tidy look vs nutrient uptake and algae suppression |
| Algae response | Algaecide / aeration / alum / do nothing | Fast visible fix vs cost, recurrence and fish-kill risk |
| Resident outreach | Fertilizer and clippings education, signage | Slow, cheap load reduction with uncertain uptake |
| Inspections and outlet clearing | Frequency | Cost vs risk of clogging and flooding |
| Sediment removal | Dredge now / defer | Large one-time cost vs lost volume and internal loading |
| Biological controls | Grass carp, fountain, native plantings | Weed control vs over-grazing or added nutrients |
| Reserve fund | Amount set aside each year | Cash for emergencies vs money not spent on upkeep |

## Simulation engine

Run a reduced-complexity model on a daily time step, compressed so a simulated year plays in a few minutes, with storm days refined to hourly so peak stage and flooding are captured. Keep the engine a pure, deterministic module (inputs + random seed in, state out) so it can be tested and validated apart from the game interface.

| Module | Approach | Key outputs |
| --- | --- | --- |
| Rainfall | Synthetic daily series (see next section) | Daily depth, storm hyetographs |
| Runoff | SCS curve number or runoff coefficient by land use; reuse the Harper/BMPTRAINS EMCs and BMP logic from the Stormwater Advisor Tool | Runoff volume, TN/TP/TSS load per event |
| Pond water balance | Inflow, ET, infiltration/groundwater exchange, stage-storage and stage-discharge from the player's outlet | Stage, outflow, residence time, flood stage |
| Nutrients | Completely mixed mass balance with first-order settling and plant uptake; internal P release under low DO | Pond TN/TP, effluent load, percent removal |
| Algae and clarity | Chlorophyll-a driven by TP, temperature, light and residence time | Chl-a, Secchi depth, bloom flag |
| Dissolved oxygen | Simple day/night DO driven by temperature, algae and aeration | Low-DO days, fish-kill risk |
| Vegetation | Littoral and nuisance plant cover responding to nutrients and management | Cover %, uptake, weed problems |
| Sediment | TSS accumulation reducing permanent pool volume | Lost volume, dredge trigger |

Calibrate removal against published Florida wet detention relationships (removal vs residence time) so long-run results match what practitioners expect, and document every equation in a technical appendix.

In Levels 1 and 2, simple choices map to engine parameters behind the scenes (a "big pond" card sets volume and depth; "plants on the edge" sets littoral shelf width), so non-technical players get the same realistic outcomes without seeing the numbers.

## Weather and extreme events

Generate rainfall with a two-state Markov chain (wet/dry day) and a gamma distribution for depth, fitted by month to a long NOAA record for a Florida station so the wet-season/dry-season rhythm is real. Layer rare events on top by return period, and expose the random seed so an instructor can give a whole class the same weather.

**Weather events**

- Design storm and beyond: 25-, 100- and 500-year rainfall days that test the outlet and freeboard
- Tropical storm or hurricane: multi-day rain, wind-damaged plantings, debris clogging the outlet
- Drought year: low stage, exposed banks, concentrated nutrients, fish stress
- Heat wave: warm water, low DO, bloom and fish-kill risk
- Future-climate toggle: shifted rainfall intensity for a "2060" scenario

**Human and ecological surprises**

- Upstream construction sends a sediment slug
- A resident over-fertilizes or dumps clippings
- Invasive plant (for example hydrilla) establishes
- Budget cut from the HOA board, or a new ordinance or permit requirement
- Complaint wave from residents after a visible bloom

Give players limited tools to prepare: a short-range forecast before storms, the option to pre-lower the pool where the outlet allows, and the reserve fund.

## Scoring

Score three meters continuously, treat flood protection as a pass/fail gate, and let each scenario set the weights, so players discover there is no single best pond, only better tradeoffs.

| Meter | Built from | Shown to player as |
| --- | --- | --- |
| Water quality | TN and TP load reduction vs target, chlorophyll-a, low-DO days | Grade plus downstream "report card" |
| Aesthetics | Bloom days, clarity, odor events, shoreline look, wildlife sightings | Resident satisfaction and complaint feed |
| Cost | Capital plus O&M as net present value against the budget | Budget bar, reserve balance |
| Flood protection (gate) | Peak stage vs road and finished-floor elevations | Pass, or a heavy penalty and event replay |

Scenario weights carry the lesson: an HOA scenario weights aesthetics and cost, a regulatory scenario weights water quality. End each game with a tradeoff chart that places the player's pond against the best possible ponds for each goal, plus a short "what drove your result" debrief tied to their decisions.

Level 1 shows the meters as pictures (pond clarity, number of fish, neighbor faces, coins left) with a one-to-three star rating per goal, and those stars drive unlocking. Level 2 adds numeric meters; Level 3 adds the full dashboard and tradeoff chart.

## Technology and architecture

Ship it as a static web app in TypeScript, like the Stormwater Advisor Tool, so it runs on phones, school laptops and kiosks with no install and no server.

- **Simulation core:** a standalone TypeScript package with no UI code; unit tests check mass balance closure and match reference runs.
- **Game interface:** React for menus, dashboards and decision cards; PixiJS or Phaser for an animated 2D pond whose color, plants and water level reflect the model state.
- **Content as data:** scenarios, costs, events and weights in JSON files, so new sites and lessons need no code changes.
- **Shared code:** pull the BMP catalog, EMCs and removal logic from the Stormwater Advisor Tool into a common library both projects use.
- **Hosting:** static hosting (UF web space or GitHub Pages) for the MVP; add a small backend later only for classroom codes, leaderboards and anonymized play logs.
- **Research logging:** optional, consent-based logging of decisions and scores to study learning, reviewed by the IRB before any data collection.
- **Build workflow:** Claude Code for most implementation, with a human-verified technical appendix in line with lab AI policy.

**Accessibility and classroom use**

- Plain language at about a sixth-grade reading level in Level 1, with audio narration, keyboard play and color-blind-safe meters
- Runs on phones, tablets and school Chromebooks; test early through a district web filter
- No account or personal data needed to play, which also keeps student use clear of COPPA and FERPA issues
- Workshop and class codes that start a group on the same scenario and weather seed, with an anonymous group results summary
- Spanish version planned from the start by keeping all text in content files

## Phased roadmap

Build and validate the simulation core before the game shell, and put a playable slice in front of real HOA board members within about eight months.

| Phase | Dates (proposed) | Work | Gate to the next phase |
| --- | --- | --- | --- |
| 1. Concept and game design | Nov 2026 to Jan 2027 | Game design doc, decision cards, scoring rules; paper prototype tested with HOA boards and agents | Audience, format and scope locked |
| 2. Simulation core | Feb to Apr 2027 | Headless engine, rainfall generator, unit tests; check runs against published wet pond removal | Model matches published removal curves |
| 3. Playable vertical slice | May to Jul 2027 | Playable Level 1 with star scoring and unlock; animated pond view, first workshop playtests | Players finish and can explain their score |
| 4. Content and playtesting | Aug to Dec 2027 | Levels 2 and 3, challenge scenarios, skip-ahead; expert panel review, IRB approval for the study | Expert panel signs off on model and content |
| 5. Launch and evaluation | Jan to Jun 2028 | Public release, extension workshop kit; pre/post learning study, EDIS publication | |

Dates are a proposed starting point assuming one student developer from November 2026; each gate is a go/no-go review before the next phase starts.

## Validation, learning assessment, and funding

The game is credible only if the model behaves like real ponds and players demonstrably learn, so build both checks into the schedule rather than after launch.

**Technical validation**

- Compare long-run removal with published Florida wet detention removal-vs-residence-time relationships
- Cross-check storm hydraulics against a SWMM model of the same pond
- Compare seasonal stage, nutrient and DO patterns with monitored ponds (for example GatorByte deployments)
- Expert review panel of pond managers, engineers and extension agents

**Learning assessment**

- Co-design with HOA board members, pond management contractors and extension agents from the concept phase, plus 2 to 3 teachers to keep Level 1 student-friendly
- Pre/post concept quiz and a short "what would you do" pond scenario at extension workshops
- Track how many players unlock each level and which goal blocks them, from anonymized play data
- Follow-up survey of HOA and contractor participants on changed practices at 3 to 6 months
- IRB approval before collecting any participant data; district approval for any classroom study

**Funding and dissemination options**

- Extension and outreach grants (USDA NIFA, Florida Sea Grant, EPA environmental education, water management district public outreach programs), with youth STEM programs as a secondary angle
- Education and outreach component on existing stormwater grants
- EDIS publication, an extension agent workshop kit, and a Journal of Extension article on outcomes

## Open decisions

These choices shape scope the most and should be settled before the engine prototype starts.

- [ ] Unlock thresholds: how hard Level 2 and Level 3 should be to earn
- [ ] Whether Level 3 ships in the first release or as a later update
- [ ] Continuing education credit: which programs to approach for pond managers and engineers
- [ ] Partner HOAs, contractors and extension counties for co-design and pilots
- [ ] Scale: one pond, or a neighborhood with several connected ponds
- [ ] Visual style: friendly illustrated top-down 2D (recommended), isometric, or dashboard-first
- [ ] Team: student developer, game designer, artist, evaluator
- [ ] Budget and funding source for the first year
- [ ] Working title
