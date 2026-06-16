// ============================================
//  TYPES
// ============================================

export type TileState = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
};

export type GamePhase = 'idle' | 'playing' | 'won' | 'lost';

export type UpgradeId =
  | 'money_per_tile'
  | 'reveal_area'
  | 'auto_clear'
  | 'auto_clear_speed'
  | 'auto_flag'
  | 'auto_flag_speed'
  | 'longer_timer'
  | 'board_clear_bonus';

export type Upgrade = {
  id: UpgradeId;
  name: string;
  desc: (level: number) => string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  /** Returns the effective value at the given level.
   *  For speed upgrades this is the interval in ms for one bot;
   *  the timer system reads botCount separately. */
  effect: (level: number) => number;
  /** Optional hard max level. Only set for speed upgrades (bot system). */
  hardMax?: number;
};

export type GameState = {
  money: number;
  totalMoney: number;
  boardsCleared: number;
  boardNumber: number;
  prestigeCount: number;
  prestigeMultiplier: number;
  phase: GamePhase;
  timeLeft: number;
  upgrades: Record<UpgradeId, number>;
  // Board dimensions grow with prestige
  cols: number;
  rows: number;
  mineCount: number;
};