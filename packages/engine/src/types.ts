export interface SizeOption { id: number; name: string; cost: number; vol: number; note: string }
export interface PlantOption { id: number; name: string; cost: number; p: number; note: string }
export interface SimpleOption { id: number; name: string; cost: number; note: string }

export interface DesignOptions {
  size: SizeOption[];
  plants: PlantOption[];
  trap: SimpleOption[];
  fountain: SimpleOption[];
}

export interface Action {
  id: string;
  name: string;
  cost: number;
  tag: string;
  text: string;
  needs?: string;
}

export interface DepthOption { id: number; name: string; cost: number; volMult: number; internalWet: number; note: string }
export interface OutletOption { id: number; name: string; cost: number; capacityAdj: number; removalAdj: number; clogRate: number; note: string }
export interface RainGardenOption { id: number; name: string; cost: number; loadCut: number; peakCut: number; note: string }

/** Level 2 design inputs. Omitting them (Level 1) is the same as the defaults: standard depth, standard outlet, no rain gardens. */
export interface Level2DesignOptions {
  depth: DepthOption[];
  outlet: OutletOption[];
  rainGardens: RainGardenOption[];
}

/** Index into each list in DesignOptions (and, for Level 2, Level2DesignOptions). */
export interface Design {
  size: number; plants: number; trap: number; fountain: number;
  depth?: number; outlet?: number; rainGardens?: number;
}

export interface ChallengeSeason {
  season: SeasonKind;
  kind: Weather['kind'];
  rain: number;
  rainJitter?: number;
  mult: number;
  storm: boolean;
  big: boolean;
  stormDepth?: number;
  /** Adds a seeded 0 to this many inches to stormDepth, so each weather code is a slightly different storm. */
  stormDepthJitter?: number;
  windDamage?: boolean;
  heatChance?: number;
}

export interface Challenge {
  name: string;
  budget: number;
  annualBudget: number;
  seasons: ChallengeSeason[];
}

export interface ScenarioSettings {
  level2: { maxPicks: number; annualBudget: number };
  challenges: Record<string, Challenge>;
}

export type SeasonKind = 'wet' | 'dry';
export type Surprise = 'clippings' | 'construction' | null;

export interface Weather {
  season: SeasonKind;
  year: number;
  kind: 'typical' | 'hurricane' | 'tropical' | 'drought';
  rain: number;
  mult: number;
  storm: boolean;
  big: boolean;
  heat: boolean;
  drought?: boolean;
  /** Overrides the storm depth for this season (challenge scenarios only). */
  stormDepth?: number;
  /** Wind strips plantings and floods the outlet with debris (hurricane challenge only). */
  windDamage?: boolean;
  surprise: Surprise;
  roll: number;
}

export interface HistoryEntry {
  A: number; N: number; mood: number; cash: number;
  exported: number; removal: number; rain: number; homes: number; looks: number;
  /** Peak storm depth as a percent of what the pond can hold; over 100 floods. */
  stage: number;
  /** Everything spent this season, including repairs and cleanup. */
  spend: number;
}

export interface GameState {
  seed: number;
  /** Set only for challenge games. */
  scenario?: string;
  design: Design;
  season: number;
  weather: Weather[];
  cash: number;
  N: number; A: number; fish: number; weeds: number; sed: number; clog: number;
  outreach: number; trapFill: number; plants: number;
  mood: number; flooded: number; assessments: number; fishKills: number;
  history: HistoryEntry[];
}

export interface Snapshot { A: number; N: number; fish: number; mood: number; cash: number }

export interface SeasonEvent { k: string; t: string }

export interface SeasonReport {
  w: Weather;
  picks: string[];
  spend: number;
  before: Snapshot & { clog: number };
  after: Snapshot;
  events: SeasonEvent[];
  why: string[];
  homes: number;
  kill: boolean;
  removal: number;
  exported: number;
  looks: number;
  stormDepth: number;
  capacity: number;
  /** Same as the history entry: storm depth as a percent of capacity. */
  stagePct: number;
}

export interface Score {
  wq: number; looks: number; cost: number;
  flood: boolean; unlocked: boolean;
  avgA: number; avgExp: number; avgMood: number; avgN: number;
}

export interface ChallengeResult {
  noFlood: boolean;
  noFishKill: boolean;
  withinBudget: boolean;
  passed: boolean;
}
