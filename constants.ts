
import type { LevelData } from './types';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Orb and Grid Constants
export const ORB_DIAMETER = 40;
export const ORB_RADIUS = ORB_DIAMETER / 2;
export const GRID_COLS = 16;
export const GRID_ROWS = 14;
export const ORB_COLORS = ['#ff4141', '#41a8ff', '#53ff41', '#ffda41', '#b841ff', '#ff8f41', '#41ffde'];
export const ORB_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎'];
export const ORB_SPEED = 15;

// Gameplay Constants
export const NUM_CHEVRONS = 7;
export const SHOTS_BEFORE_CEILING_DROP = 8;
export const CEILING_ROW_LIMIT = 11;

// --- LEVEL DATA ---
// Each number corresponds to an index in ORB_COLORS. null is an empty space.
export const LEVELS: LevelData[] = [
  { // Level 1
    layout: [
      [0, 0, 1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0],
      [4, 1, 1, 2, 2, 3, 3, null, null, 3, 3, 2, 2, 1, 4, 4],
      [null, 5, 2, 3, 3, null, null, null, null, null, null, 3, 3, 2, 5, null],
      [null, null, 6, 3, null, null, null, null, null, null, null, null, 3, 6, null, null],
    ]
  },
  { // Level 2
    layout: [
      [4, 4, 4, null, null, 1, 1, 1, 1, 1, 1, null, null, 2, 2, 2],
      [null, 4, 5, null, 1, 1, 1, 1, 1, 1, 1, 1, null, 5, 2, null],
      [null, 6, null, 1, 1, 0, 0, 3, 3, 0, 0, 1, 1, null, 6, null],
      [null, null, 1, 1, 0, 0, 3, 3, 3, 3, 0, 0, 1, 1, null, null],
      [null, null, 1, 0, 0, 3, 3, 2, 2, 3, 3, 0, 0, 1, null, null],
    ]
  },
  { // Level 3
    layout: [
      [0, 1, 2, 3, 4, 5, 0, 1, 1, 0, 5, 4, 3, 2, 1, 0],
      [0, 1, 2, 3, 4, 5, 0, null, null, 0, 5, 4, 3, 2, 1, 0],
      [6, 1, 2, 3, 4, 5, null, null, null, null, 5, 4, 3, 2, 1, 6],
      [null, null, 2, 3, 4, null, null, null, null, null, null, 4, 3, 2, null, null],
      [null, null, null, 3, 4, null, null, 2, 2, null, null, null, 3, 4, null, null],
    ]
  },
];