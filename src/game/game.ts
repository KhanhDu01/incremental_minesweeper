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
import { toggleAdSpace } from './components/adSpace';
import { getStartingTime } from '../config/config';
import { resetState } from './state';

// ============================================================
//  GAME — thin orchestrator
// ============================================================

export function newGame() {
  stopGameTimer();
  setTiles([]);
  setBoardInitialized(false);
  state.timeLeft = getStartingTime(state.prestigeCount) + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
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

  setNewGameCallback(newGame);
  setNewGameCallbackForTimers(newGame);
  setNewGameCallbackForPrestige(newGame);
  setFlagModeGetter(getFlagMode);
  setAutoMinerPausedGetter(getAutoMinerPaused);
  setAutoMinerPausedGetterForUpgrades(getAutoMinerPaused);
  setTileHandlers(onTileClick, onTileRightClick);

  resetBtn.addEventListener('click', () => resetGame());
  prestigeBtn.addEventListener('click', () => prestige());

  // Ad panel toggle + close button
  const adToggleBtn = document.getElementById('ad-toggle-btn');
  const adCloseBtn  = document.getElementById('ad-close-btn');
  if (adToggleBtn) adToggleBtn.addEventListener('click', () => toggleAdSpace());
  if (adCloseBtn)  adCloseBtn.addEventListener('click', () => toggleAdSpace(true));

  initToolbar();
  renderUpgrades();
  newGame();
  startSaveTimer();
  startMpsTimer();
  updateHUD();
}