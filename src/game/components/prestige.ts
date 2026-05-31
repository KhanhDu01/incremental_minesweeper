import { state } from '../state';
import { DEFAULT_STATE, saveGame } from '../save';
import { showToast, updateHUD, updatePrestigeBar } from '../hud';
import { stopAllTimers } from '../helper/timers';
import { renderUpgrades } from '../renderer/upgrades-ui';
import { CONFIG } from '../../config/config';

// ============================================================
//  PRESTIGE
// ============================================================

export function canPrestige(): boolean {
  return state.boardsCleared >= CONFIG.PRESTIGE_BOARDS_REQUIRED * (state.prestigeCount + 1);
}

// newGame injected from game.ts to avoid circular deps
let _newGame: () => void = () => {};
export function setNewGameCallbackForPrestige(fn: () => void) { _newGame = fn; }

export function prestige() {
  if (!canPrestige()) return;

  state.prestigeCount++;
  state.prestigeMultiplier = 1 + state.prestigeCount * 0.5;
  state.boardsCleared = 0;
  state.boardNumber = 1;
  state.upgrades = { ...DEFAULT_STATE.upgrades };
  state.cols = CONFIG.cols + state.prestigeCount * 3;
  state.rows = CONFIG.rows + state.prestigeCount * 3;
  state.mineCount = Math.floor(state.cols * state.rows * 0.15);
  state.money = 0;

  showToast(`⭐ PRESTIGE ${state.prestigeCount}! Board grows! x${state.prestigeMultiplier.toFixed(1)} earnings!`);

  saveGame(state);
  stopAllTimers();
  renderUpgrades();
  _newGame();
  updateHUD();
  updatePrestigeBar();
}
