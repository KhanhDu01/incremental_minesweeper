import { state } from '../state/state';
import { DEFAULT_STATE, saveGame } from '../state/save';
import { showToast, updateHUD, updatePrestigeBar } from '../ui/hud';
import { stopAllTimers } from './timers';
import { renderUpgrades } from '../upgrades/upgrades-ui';
import { CONFIG, getBoardDims, getStartingTime } from '../config';

// ============================================================
//  PRESTIGE
// ============================================================

export function canPrestige(): boolean {
  return state.boardsCleared >= CONFIG.PRESTIGE_BOARDS_REQUIRED * (state.prestigeCount + 1);
}

let _newGame: () => void = () => {};
export function setNewGameCallbackForPrestige(fn: () => void) { _newGame = fn; }

export function prestige() {
  if (!canPrestige()) return;

  state.prestigeCount++;
  state.prestigeMultiplier = 1 + state.prestigeCount * 0.5;
  state.boardsCleared = 0;
  state.boardNumber = 1;
  state.upgrades = { ...DEFAULT_STATE.upgrades };
  state.money = 0;

  // Board dimensions and time come entirely from config helpers
  const dims = getBoardDims(state.prestigeCount);
  state.cols = dims.cols;
  state.rows = dims.rows;
  state.mineCount = dims.mineCount;
  state.timeLeft = getStartingTime(state.prestigeCount);

  showToast(`⭐ PRESTIGE ${state.prestigeCount}! ${state.cols}×${state.rows} board, x${state.prestigeMultiplier.toFixed(1)} earnings!`);

  saveGame(state);
  stopAllTimers();
  renderUpgrades();
  _newGame();
  updateHUD();
  updatePrestigeBar();
}