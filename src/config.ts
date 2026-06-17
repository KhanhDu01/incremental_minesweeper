// ============================================================
//  CONFIG
//  All game constants live here.
// ============================================================

export const CONFIG = {
  // ---- Starting resources ----
  money: 0,
  totalMoney: 0,
  boardsCleared: 0,
  totalBoardsCleared: 0,
  boardNumber: 1,
  prestigeCount: 0,
  prestigeMultiplier: 1,
  phase: 'idle',

  // ---- Base board (prestige 0) ----
  baseCols: 7,
  baseRows: 7,
  baseMineRatio: 0.20,
  baseTimeLeft: 15,

  // ---- Prestige scaling (added per prestige level) ----
  prestigeColsPerLevel: 3,
  prestigeRowsPerLevel: 3,
  prestigeTimePerLevel: 0,

  // ---- Bot system ----
  BOT_LEVEL_INTERVAL: 20,
  BOT_SPEED_LEVELS: 20,

  // ---- Prestige thresholds (based on TOTAL boards cleared, never resets) ----
  // Format: [totalBoardsRequired, prestigeLevelsGranted]
  PRESTIGE_THRESHOLDS: [
    [5,   1],
    [15,  2],
    [30,  3],
    [55,  4],
    [90,  5],
    [140, 6],
    [200, 7],
    [280, 8],
    [380, 9],
    [500, 10],
  ] as [number, number][],

  // ---- Persistence ----
  SAVE_KEY: 'incremental_minesweeper_save_v4',

  // ---- Ad space ----
  adPassiveIncomePerSec: 5,

  // ---- Offline income ----
  // Fraction of current MPS earned while offline (0.5 = 50% efficiency)
  offlineEfficiency: 0.5,
  // Maximum offline hours to credit (cap at 8 hours)
  maxOfflineHours: 8,

  // ---- MPS averaging window (seconds) ----
  mpsWindowSeconds: 5,

  // ---- Board clear: time bonus multiplier ----
  // Board bonus is multiplied by (timeLeft / totalTime) up to 2x
  timeBonusMax: 2.0,
};

// ---- Derived helpers (pure functions, no state) ----

export function getBoardDims(prestigeCount: number): { cols: number; rows: number; mineCount: number } {
  const cols = CONFIG.baseCols + prestigeCount * CONFIG.prestigeColsPerLevel;
  const rows = CONFIG.baseRows + prestigeCount * CONFIG.prestigeRowsPerLevel;
  const mineCount = Math.max(1, Math.floor(cols * rows * CONFIG.baseMineRatio));
  return { cols, rows, mineCount };
}

export function getStartingTime(prestigeCount: number): number {
  return CONFIG.baseTimeLeft + prestigeCount * CONFIG.prestigeTimePerLevel;
}

export function getEffectiveMaxLevel(_prestigeCount: number): number {
  return Infinity;
}

/**
 * How many prestige levels should be earned for a given TOTAL boards-cleared count?
 * Uses totalBoardsCleared (never resets) instead of per-prestige boardsCleared.
 */
export function calcPrestigeLevelsForBoards(totalBoardsCleared: number): number {
  let total = 0;
  for (const [req, lvls] of CONFIG.PRESTIGE_THRESHOLDS) {
    if (totalBoardsCleared >= req) total = lvls;
  }
  return total;
}

export function getPrestigeMultiplier(prestigeCount: number): number {
  return 1 + prestigeCount * 0.5;
}

export function getTimerUpgradeSecondsPerLevel(_prestigeCount: number): number {
  return 5; // flat +5 seconds per level, regardless of prestige
}