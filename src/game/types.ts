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
  maxLevel: number;
  effect: (level: number) => number; // returns the effective value at given level
};

export type GameState = {
  money: number;
  totalMoney: number;
  boardsCleared: number;
  boardNumber: number;  // current board index (grows with prestige)
  prestigeCount: number;
  prestigeMultiplier: number;
  phase: GamePhase;
  timeLeft: number;
  upgrades: Record<UpgradeId, number>; // level per upgrade
  // Board dimensions grow with prestige
  cols: number;
  rows: number;
  mineCount: number;
};
