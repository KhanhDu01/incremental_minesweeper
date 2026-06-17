import { state } from '../state/state';
import { DEFAULT_STATE, saveGame } from '../state/save';
import { showToast, updateHUD, updatePrestigeBar } from '../ui/hud';
import { stopAllTimers } from './timers';
import { renderUpgrades } from '../upgrades/upgrades-ui';
import { getBoardDims, getStartingTime, calcPrestigeLevelsForBoards, getPrestigeMultiplier } from '../config';
import { checkAchievements } from './achievements';
import { EMOJI_PRESTIGE } from '../assets/index';

// ============================================================
//  PRESTIGE
//  Based on totalBoardsCleared (never resets between prestiges).
// ============================================================

export function prestigeLevelsEarned(): number {
  return calcPrestigeLevelsForBoards(state.totalBoardsCleared);
}

export function canPrestige(): boolean {
  return prestigeLevelsEarned() > state.prestigeCount;
}

let _newGame: () => void = () => {};
export function setNewGameCallbackForPrestige(fn: () => void) { _newGame = fn; }

export function prestige() {
  const earned = prestigeLevelsEarned();
  if (earned <= state.prestigeCount) return;

  const levelsGained = earned - state.prestigeCount;
  state.prestigeCount = earned;
  state.prestigeMultiplier = getPrestigeMultiplier(state.prestigeCount);

  // Reset per-prestige state (boardsCleared resets, totalBoardsCleared does NOT)
  state.boardsCleared = 0;
  state.boardNumber   = 1;
  state.upgrades      = { ...DEFAULT_STATE.upgrades };
  state.money         = 0;

  const dims = getBoardDims(state.prestigeCount);
  state.cols      = dims.cols;
  state.rows      = dims.rows;
  state.mineCount = dims.mineCount;
  state.timeLeft  = getStartingTime(state.prestigeCount);

  const lvlText = levelsGained > 1 ? `+${levelsGained} LEVELS` : `+1 LEVEL`;
  showToast(
    `${EMOJI_PRESTIGE} PRESTIGE ${state.prestigeCount} (${lvlText})! ` +
    `${state.cols}×${state.rows} board, x${state.prestigeMultiplier.toFixed(1)} earnings!`
  );

  checkAchievements();
  saveGame(state);
  stopAllTimers();
  renderUpgrades();
  _newGame();
  updateHUD();
  updatePrestigeBar();
}