// ============================================================
//  CONFIG
//  All game constants live here.
//  Prestige scaling is expressed as per-prestige-level deltas
//  so nothing is hard-coded in game logic.
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
  baseMineRatio: 0.20,   // fraction of tiles that are mines
  baseTimeLeft: 15,      // seconds

  // ---- Prestige scaling (added per prestige level) ----
  prestigeColsPerLevel: 3,
  prestigeRowsPerLevel: 3,
  prestigeTimePerLevel: 0,   // +0s per prestige level

  // ---- Upgrade max-level scaling ----
  // effectiveMax = upgradeBaseMax + prestigeCount * upgradeMaxLevelPerPrestige
  upgradeBaseMax: 3,           // levels allowed at prestige 0
  upgradeMaxLevelPerPrestige: 2,

  // ---- Prestige requirement ----
  PRESTIGE_BOARDS_REQUIRED: 5,

  // ---- Persistence ----
  SAVE_KEY: 'incremental_minesweeper_save_v2',

  // ---- Ad space ----
  adPassiveIncomePerSec: 5,   // in-game $/s while ad panel is visible
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

/** Returns the effective max level for an upgrade at the given prestige level.
 *  absoluteMax = the hard cap defined on the Upgrade itself.
 */
export function getEffectiveMaxLevel(prestigeCount: number): number {
  return CONFIG.upgradeBaseMax + prestigeCount * CONFIG.upgradeMaxLevelPerPrestige;
}