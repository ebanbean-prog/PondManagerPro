import designJson from '@pond-steward/content/design.json';
import actionsJson from '@pond-steward/content/actions.json';
import type { Action, DesignOptions } from './types.js';

export const DESIGN: DesignOptions = designJson;
export const ACTIONS: Action[] = actionsJson;

export const BUDGET = 50000;
export const DUES = 1500;
export const FOUNTAIN_POWER = 500;
export const SEASONS = 10;
