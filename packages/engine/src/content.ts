import designJson from '@pond-steward/content/design.json';
import actionsJson from '@pond-steward/content/actions.json';
import scenarioJson from '@pond-steward/content/scenario.json';
import type { Action, DesignOptions } from './types.js';

export const DESIGN: DesignOptions = designJson;
export const ACTIONS: Action[] = actionsJson;

export const BUDGET = scenarioJson.budget;
export const DUES = scenarioJson.dues;
export const FOUNTAIN_POWER = scenarioJson.fountainPower;
export const SEASONS = scenarioJson.seasons;
