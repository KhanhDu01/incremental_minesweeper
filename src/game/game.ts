import { state, setTiles, setBoardInitialized } from './state';
import { cacheDomRefs, smileyBtn, prestigeBtn, resetBtn } from './dom';
import { UPGRADE_MAP } from './components/upgrades';
import { renderBoard, setTileHandlers } from './renderer/renderer';
import { onTileClick, onTileRightClick, setFlagModeGetter, setNewGameCallback } from './input';
import { updateMineCounter, updateTimerDisplay, updateHUD, updatePrestigeBar } from './hud';
import { updateUpgradesAffordability, renderUpgrades, setAutoMinerPausedGetterForUpgrades } from './renderer/upgrades-ui';
import { startMpsTimer, startSaveTimer, setNewGameCallbackForTimers, setAutoMinerPausedGetter, stopAllTimers } from './helper/timers';
import { stopGameTimer } from './helper/timers';
import { prestige, setNewGameCallbackForPrestige } from './components/prestige';
import { initToolbar, getFlagMode, getAutoMinerPaused } from './components/toolbar';
import { CONFIG } from '../config/config';
import { resetState } from './state';

// ============================================================
//  GAME — thin orchestrator
//  Wires all modules together. Contains only newGame() and init().
// ============================================================

export function newGame() {
  stopGameTimer();

  setTiles([]);
  setBoardInitialized(false);
  state.timeLeft = CONFIG.timeLeft + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
  state.phase = 'idle';

  renderBoard();
  updateMineCounter();
  updateTimerDisplay();
  smileyBtn.textContent = '🙂';
  updateUpgradesAffordability();
  updatePrestigeBar();
}

export function resetGame() {
  stopAllTimers();
  resetState();
  renderUpgrades();
  newGame();
  startSaveTimer();
  startMpsTimer();
  updateHUD();
}

export function init() {
  cacheDomRefs();

  // Wire cross-module callbacks (avoids circular imports)
  setNewGameCallback(newGame);
  setNewGameCallbackForTimers(newGame);
  setNewGameCallbackForPrestige(newGame);
  setFlagModeGetter(getFlagMode);
  setAutoMinerPausedGetter(getAutoMinerPaused);
  setAutoMinerPausedGetterForUpgrades(getAutoMinerPaused);
  setTileHandlers(onTileClick, onTileRightClick);

  resetBtn.addEventListener('click', () => resetGame());
  prestigeBtn.addEventListener('click', () => prestige());

  // Boot
  initToolbar();
  renderUpgrades();
  newGame();
  startSaveTimer();
  startMpsTimer();
  updateHUD();
}
