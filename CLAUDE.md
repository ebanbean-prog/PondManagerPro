# Pond Steward

A browser game that teaches stormwater pond design and management. Players design a Florida wet detention pond, then care for it season by season, balancing water quality, how the pond looks, and cost against variable rainfall and extreme storms.

Owner: Eban Bean, Ph.D., P.E., UF/IFAS Agricultural and Biological Engineering.

## Audience and levels

- **Primary audience:** non-technical adults (HOA boards, property managers, pond management contractors, residents).
- **Secondary audience:** middle and high school students (Level 1 must stay readable at about a sixth-grade level), and technical professionals (Level 3).
- **Level 1, Pond Steward:** picture cards, plain language, star scoring. Prototype exists.
- **Level 2, Pond Manager:** adds depth, outlet size, upstream rain gardens, an annual budget, and simple rain and water-level graphs. Unlocked by 2+ stars on every Level 1 goal with no flooded homes.
- **Level 3, Pond Engineer:** full parameter set and dashboard (loads, concentrations, chlorophyll-a, DO, NPV). Unlocked by passing the Hurricane Year challenge in Level 2 (no flooding, no fish kill, within budget), or via a skip-ahead challenge for professionals.

The full development plan is in `docs/` (exported from the Claude Docs plan).

## Architecture rules

1. **One engine for all levels.** The simulation is a pure, deterministic module: (state, player choices, seed) in, (new state, report) out. No DOM, no globals, no randomness outside the seeded RNG. Levels differ only in which choices are exposed and how results are shown.
2. **Same seed, same weather.** The weather schedule for a game is fixed by its weather code, so a workshop group can play identical conditions. Never draw weather from `Math.random()`.
3. **Content as data.** Design options, actions, costs, events, explanation text and scenario settings belong in JSON files, not hard-coded in UI components. This also keeps a Spanish translation possible.
4. **Static first.** The game must run as a static site (GitHub Pages or UF web space) on phones, tablets and school Chromebooks. No server, no accounts, no personal data unless a later research phase adds them with IRB approval.
5. **Accessible by default.** Keyboard play, visible focus states, color-blind-safe meters, `prefers-reduced-motion` respected, light and dark themes.

## Planned structure

```
packages/engine/   TypeScript simulation core + unit tests (no UI imports)
packages/content/  JSON: design options, actions, events, scenarios, text
apps/game/         UI (Level 1 SVG scene; React + PixiJS or SVG for later levels)
tools/balance/     Monte Carlo balance runs across strategies and seeds
docs/              Development plan, technical appendix of model equations
```

## Model and calibration

The prototype engine (`engine.js`) uses plausible placeholder relationships, not calibrated ones. Calibration targets:

- Long-run nutrient removal should match published Florida wet detention removal-vs-residence-time relationships.
- Runoff loads should use Harper/BMPTRAINS event mean concentrations by land use; share BMP and EMC logic with the Florida Stormwater Advisor Tool where possible rather than duplicating it.
- Storm hydraulics should be cross-checked against a SWMM model of the same pond.

Every equation and coefficient goes in `docs/technical-appendix.md` with its source. Lab AI policy: Eban verifies all model content, AI use is disclosed, and no unpublished data goes into prompts.

## Balance targets (Level 1)

Check with `tools/balance` after any engine change (200 seeds per strategy):

| Strategy | Expected outcome |
| --- | --- |
| Small pond, no actions | Fails every goal |
| Mow to the edge + algaecide every season | Looks fine to neighbors, but fails water quality and runs the fund negative |
| Standard pond, narrow plant shelf, no-mow strip, outlet cleared before wet seasons | Unlocks Level 2 in roughly 60 to 70 percent of seeds (late floods from silt buildup) |
| Large pond + wide plant shelf | Always unlocks, but with a thin fund (2 cost stars) |

A balance change that makes the "pretty but harmful" strategy unlock Level 2 is a regression.

## Balance targets (Level 2, provisional)

Level 2 adds three design inputs (depth, outlet size, upstream rain gardens), three actions (lower the pond before storms, replant, dredge), up to 5 picks per season, and the Hurricane Year challenge (4 seasons: no flooding, no fish kill, within the annual budget). All Level 2 coefficients are placeholders until Eban verifies them. `tools/balance` prints these after the Level 1 table. Level 1 output must not change when Level 2 changes.

| Hurricane Year strategy | Expected pass rate |
| --- | --- |
| Small pond, no actions | 0% |
| Mow to the edge + algaecide | 0% (no fish kills, but floods and overspends) |
| Standard pond, outlet cleared, no pre-storm drawdown | 0% |
| Standard pond, outlet cleared, pond lowered before the hurricane | about 55 to 60% (depends on the storm size for the weather code) |
| Standard pond + large outlet + 2 rain gardens, same actions | 100% |
| Large pond + wide plant shelf, outlet cleared | 100% |

## Conventions

- TypeScript strict mode; engine functions are pure and fully unit tested.
- Rainfall in inches, money in US dollars, seasons labeled wet (Jun–Oct) and dry (Nov–May).
- Player-facing text: plain, active voice, no jargon in Levels 1 and 2. Each season report explains causes in a "Why did that happen?" box.
- Commit small, working steps; keep the deployed site playable at all times.
