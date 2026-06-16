import { state } from '../state/state';
import { DEFAULT_STATE, saveGame } from '../state/save';
import { showToast, updateHUD, updatePrestigeBar } from '../ui/hud';
import { stopAllTimers } from './timers';
import { renderUpgrades } from '../upgrades/upgrades-ui';
import { /*CONFIG, */getBoardDims, getStartingTime, calcPrestigeLevelsForBoards, getPrestigeMultiplier } from '../config';

// ============================================================
//  PRESTIGE
// ============================================================

/** How many prestige levels should the player earn right now?
 *  Based on their total boards cleared hitting a threshold. */
export function prestigeLevelsEarned(): number {
  return calcPrestigeLevelsForBoards(state.boardsCleared);
}

/** Can the player prestige? Yes if they've earned more levels than they currently have. */
export function canPrestige(): boolean {
  return prestigeLevelsEarned() > state.prestigeCount;
}

let _newGame: () => void = () => {};
export function setNewGameCallbackForPrestige(fn: () => void) { _newGame = fn; }

export function prestige() {
  const earned = prestigeLevelsEarned();
  if (earned <= state.prestigeCount) return; // nothing to claim

  const levelsGained = earned - state.prestigeCount;
  state.prestigeCount = earned;
  state.prestigeMultiplier = getPrestigeMultiplier(state.prestigeCount);

  // Reset per-prestige state
  state.boardsCleared = 0;
  state.boardNumber   = 1;
  state.upgrades      = { ...DEFAULT_STATE.upgrades };
  state.money         = 0;

  // Board dimensions and time from config
  const dims = getBoardDims(state.prestigeCount);
  state.cols      = dims.cols;
  state.rows      = dims.rows;
  state.mineCount = dims.mineCount;
  state.timeLeft  = getStartingTime(state.prestigeCount);

  const lvlText = levelsGained > 1 ? `+${levelsGained} LEVELS` : `+1 LEVEL`;
  showToast(
    `⭐ PRESTIGE ${state.prestigeCount} (${lvlText})! ` +
    `${state.cols}×${state.rows} board, x${state.prestigeMultiplier.toFixed(1)} earnings!`
  );

  saveGame(state);
  stopAllTimers();
  renderUpgrades();
  _newGame();
  updateHUD();
  updatePrestigeBar();
}