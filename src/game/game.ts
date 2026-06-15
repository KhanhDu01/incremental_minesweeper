import { state, setTiles, setBoardInitialized, resetState } from '../state/state';
import { cacheDomRefs, smileyBtn, prestigeBtn, resetBtn } from '../ui/dom';
import { UPGRADE_MAP } from '../upgrades/upgrades';
import { renderBoard, setTileHandlers } from '../ui/renderer';
import { onTileClick, onTileRightClick, setFlagModeGetter, setNewGameCallback } from './input';
import { updateMineCounter, updateTimerDisplay, updateHUD, updatePrestigeBar } from '../ui/hud';
import { updateUpgradesAffordability, renderUpgrades, setAutoMinerPausedGetterForUpgrades } from '../upgrades/upgrades-ui';
import { startMpsTimer, startSaveTimer, setNewGameCallbackForTimers, setAutoMinerPausedGetter, stopAllTimers } from './timers';
import { stopGameTimer } from './timers';
import { prestige, setNewGameCallbackForPrestige } from './prestige';
import { initToolbar, getFlagMode, getAutoMinerPaused, autoFitZoom, squareBoardContainer } from '../ui/toolbar';
import { toggleAdSpace } from '../ui/adSpace';
import { getStartingTime } from '../config';

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
  squareBoardContainer();
  autoFitZoom(); // auto-fit zoom whenever a new board starts (board may have grown)
  requestAnimationFrame(() => {
    squareBoardContainer();
    autoFitZoom();
  });
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

  const adToggleBtn = document.getElementById('ad-toggle-btn');
  const adCloseBtn  = document.getElementById('ad-close-btn');
  if (adToggleBtn) adToggleBtn.addEventListener('click', () => toggleAdSpace());
  if (adCloseBtn)  adCloseBtn.addEventListener('click', () => toggleAdSpace(true));

  initToolbar();
  initTabs();        // tabs wired last, after everything else
  renderUpgrades();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {   // double-rAF ensures layout is complete
      newGame();
      startSaveTimer();
      startMpsTimer();
      updateHUD();
    });
  });
}

function initTabs() {
  const tabBoardBtn    = document.getElementById('tab-board-btn');
  const tabUpgradesBtn = document.getElementById('tab-upgrades-btn');
  const tabBoard       = document.getElementById('tab-board');
  const tabUpgrades    = document.getElementById('tab-upgrades');

  if (!tabBoardBtn || !tabUpgradesBtn || !tabBoard || !tabUpgrades) return;

  tabBoardBtn.addEventListener('click', () => {
    tabBoard.classList.remove('hidden');
    tabUpgrades.classList.add('hidden');
    tabBoardBtn.classList.add('active');
    tabUpgradesBtn.classList.remove('active');
    requestAnimationFrame(() => {
      squareBoardContainer();
      autoFitZoom();
    });
  });

  tabUpgradesBtn.addEventListener('click', () => {
    tabUpgrades.classList.remove('hidden');
    tabBoard.classList.add('hidden');
    tabUpgradesBtn.classList.add('active');
    tabBoardBtn.classList.remove('active');
  });

  window.addEventListener('resize', () => {
    requestAnimationFrame(() => {
      squareBoardContainer();
      autoFitZoom();
    });
  });
}