import type { Design, GameState, Weather } from '@pond-steward/engine';

export interface Strategy {
  d: Design;
  pick: (s: GameState, w: Weather) => string[];
}

export const strategies: Record<string, Strategy> = {
  lazy_small: { d: { size: 0, plants: 0, trap: 0, fountain: 0 }, pick: () => [] },
  pretty_mow_algaecide: { d: { size: 1, plants: 0, trap: 0, fountain: 1 }, pick: () => ['mow', 'algaecide'] },
  good_std: { d: { size: 1, plants: 1, trap: 0, fountain: 0 }, pick: (s) => (s.season % 2 === 0 ? ['buffer', 'outlet'] : ['buffer', 'flyer']) },
  good_std_smart: { d: { size: 1, plants: 1, trap: 0, fountain: 0 }, pick: (_s, w) => (w.season === 'wet' ? ['buffer', 'outlet'] : ['buffer', 'flyer']) },
  wide_large: { d: { size: 2, plants: 2, trap: 0, fountain: 0 }, pick: (_s, w) => ['buffer', w.season === 'wet' ? 'outlet' : 'flyer'] },
  std_wide_trap: { d: { size: 1, plants: 2, trap: 1, fountain: 0 }, pick: (s, w) => ['buffer', w.season === 'wet' ? 'outlet' : (s.trapFill > 0.4 ? 'trapclean' : 'flyer')] },
  mow_outlet_std: { d: { size: 1, plants: 1, trap: 0, fountain: 0 }, pick: () => ['mow', 'outlet'] },
};
