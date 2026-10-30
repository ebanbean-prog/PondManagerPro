import designJson from '@pond-steward/content/design.json';
import actionsJson from '@pond-steward/content/actions.json';
import scenarioJson from '@pond-steward/content/scenario.json';
import designL2Json from '@pond-steward/content/design-level2.json';
import actionsL2Json from '@pond-steward/content/actions-level2.json';
import scenariosJson from '@pond-steward/content/scenarios.json';
import type { Action, DesignOptions, Level2DesignOptions, ScenarioSettings } from './types.js';

export const DESIGN: DesignOptions = designJson;
/** The Level 1 actions. Level 1 shows exactly these. */
export const ACTIONS: Action[] = actionsJson;

export const BUDGET = scenarioJson.budget;
export const DUES = scenarioJson.dues;
export const FOUNTAIN_POWER = scenarioJson.fountainPower;
export const SEASONS = scenarioJson.seasons;

export const DESIGN_L2: Level2DesignOptions = designL2Json;
/** Actions that only Level 2 offers (in addition to ACTIONS). */
export const ACTIONS_L2: Action[] = actionsL2Json;
export const ALL_ACTIONS: Action[] = [...ACTIONS, ...ACTIONS_L2];

export const SCENARIOS = scenariosJson as ScenarioSettings;
/** How many actions a player may pick per season, by level. */
export const MAX_PICKS = { 1: 2, 2: SCENARIOS.level2.maxPicks } as const;
/** Level 2 annual O&M budget in dollars (planned spending per two-season year). */
export const ANNUAL_BUDGET = SCENARIOS.level2.annualBudget;

/** Defaults used when a Level 2 design input is omitted, which reproduces Level 1 exactly. */
export const DEFAULT_DEPTH = 1;
export const DEFAULT_OUTLET = 1;
export const DEFAULT_RAIN_GARDENS = 0;
