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
  | 'auto_clear'
  | 'auto_clear_speed'
  | 'auto_flag'
  | 'auto_flag_speed'
  | 'longer_timer'
  | 'board_clear_bonus';

export type AchievementId =
  | 'first_board'
  | 'boards_10'
  | 'boards_50'
  | 'boards_100'
  | 'boards_500'
  | 'money_1k'
  | 'money_1m'
  | 'money_1b'
  | 'first_prestige'
  | 'prestige_5'
  | 'prestige_10'
  | 'first_bot'
  | 'bots_5'
  | 'speed_demon'
  | 'perfect_board'
  | 'offline_earner';

export type Achievement = {
  id: AchievementId;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number; // timestamp
};

export type Upgrade = {
  id: UpgradeId;
  name: string;
  desc: (level: number) => string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  effect: (level: number) => number;
  hardMax?: number;
};

export type GameState = {
  money: number;
  totalMoney: number;
  boardsCleared: number;       // resets on prestige
  totalBoardsCleared: number;  // never resets — used for prestige thresholds
  boardNumber: number;
  prestigeCount: number;
  prestigeMultiplier: number;
  phase: GamePhase;
  timeLeft: number;
  upgrades: Record<UpgradeId, number>;
  achievements: Record<AchievementId, boolean>;
  // Board dimensions grow with prestige
  cols: number;
  rows: number;
  mineCount: number;
  // Offline tracking
  lastSaveTime: number; // unix ms
};