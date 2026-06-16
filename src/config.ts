// ============================================================
//  CONFIG
//  All game constants live here.
// ============================================================

export const CONFIG = {
  // ---- Starting resources ----
  money: 0,
  totalMoney: 0,
  boardsCleared: 0,
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

  // ---- No max level cap on upgrades (except speed bots) ----
  // Speed upgrades (auto_clear_speed, auto_flag_speed) have a bot system:
  // every BOT_LEVEL_INTERVAL levels add a new bot and reset speed
  BOT_LEVEL_INTERVAL: 10,   // every 10 levels = 1 new bot, speed resets
  BOT_SPEED_LEVELS: 10,     // levels before the speed repeats per bot

  // ---- Prestige thresholds ----
  // boards cleared → prestige levels earned per threshold crossing
  // Format: [boardsRequired, prestigeLevelsGranted]
  PRESTIGE_THRESHOLDS: [
    [5,  1],
    [15, 2],
    [30, 3],
    [55, 4],
    [90, 5],
  ] as [number, number][],

  // ---- Persistence ----
  SAVE_KEY: 'incremental_minesweeper_save_v3',

  // ---- Ad space ----
  adPassiveIncomePerSec: 5,
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

/** No longer used for upgrade cap — upgrades are unlimited (except speed bots).
 *  Kept so old call-sites compile without errors. */
export function getEffectiveMaxLevel(_prestigeCount: number): number {
  return Infinity;
}

/** How many prestige levels should be earned for a given boards-cleared count?
 *  Returns 0 if the player hasn't hit the next threshold yet.
 *  Accumulates: if boardsCleared crosses multiple thresholds at once, sums them. */
export function calcPrestigeLevelsForBoards(boardsCleared: number): number {
  let total = 0;
  for (const [req, lvls] of CONFIG.PRESTIGE_THRESHOLDS) {
    if (boardsCleared >= req) total = lvls; // take the highest tier reached
  }
  return total;
}

/** Returns the prestige multiplier for a given prestige count. */
export function getPrestigeMultiplier(prestigeCount: number): number {
  return 1 + prestigeCount * 0.5;
}

/** For the "Overtime" upgrade: more seconds per level, scaled up by prestige. */
export function getTimerUpgradeSecondsPerLevel(prestigeCount: number): number {
  return 5 + prestigeCount * 2; // e.g. prestige 0→5s, 1→7s, 2→9s, …
}