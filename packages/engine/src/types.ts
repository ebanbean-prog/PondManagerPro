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

/** Index into each list in DesignOptions. */
export interface Design { size: number; plants: number; trap: number; fountain: number }

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
  surprise: Surprise;
  roll: number;
}

export interface HistoryEntry {
  A: number; N: number; mood: number; cash: number;
  exported: number; removal: number; rain: number; homes: number; looks: number;
}

export interface GameState {
  seed: number;
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
}

export interface Score {
  wq: number; looks: number; cost: number;
  flood: boolean; unlocked: boolean;
  avgA: number; avgExp: number; avgMood: number; avgN: number;
}
