import { state, setTiles, setBoardInitialized, resetState } from '../state/state';
import { cacheDomRefs, smileyBtn, prestigeBtn } from '../ui/dom';
import { UPGRADE_MAP } from '../upgrades/upgrades';
import { renderBoard, setTileHandlers } from '../ui/renderer';
import { onTileClick, onTileRightClick, setFlagModeGetter, setNewGameCallback } from './input';
import { updateMineCounter, updateTimerDisplay, updateHUD, updatePrestigeBar } from '../ui/hud';
import { updateUpgradesAffordability, renderUpgrades, setAutoMinerPausedGetterForUpgrades } from '../upgrades/upgrades-ui';
import { startMpsTimer, startSaveTimer, setNewGameCallbackForTimers, setAutoMinerPausedGetter, setAutoFlaggerPausedGetter, stopAllTimers, setBoardTransitioning, startAutoClearTimer, startAutoFlagTimer } from './timers';
import { stopGameTimer } from './timers';
import { prestige, setNewGameCallbackForPrestige } from './prestige';
import { initToolbar, getFlagMode, getAutoMinerPaused, getAutoFlaggerPaused, autoFitZoom, squareBoardContainer } from '../ui/toolbar';
import { initDevPanel } from '../ui/devPanel';
import { getStartingTime } from '../config';
import { applyOfflineEarnings } from './offline';
import { earnMoney } from './money';
import { renderAchievements } from '../ui/achievements-ui';
import { saveGame } from '../state/save';
import { EMOJI_IDLE } from '../assets/index';

// ============================================================
//  GAME — thin orchestrator
// ============================================================

export function newGame() {
  stopGameTimer();
  setBoardTransitioning(false);
  setTiles([]);
  setBoardInitialized(false);
  state.timeLeft = getStartingTime(state.prestigeCount) + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
  state.phase = 'idle';
  renderBoard();
  updateMineCounter();
  updateTimerDisplay();
  smileyBtn.textContent = EMOJI_IDLE;
  updateUpgradesAffordability();
  updatePrestigeBar();
  squareBoardContainer();
  autoFitZoom();
  requestAnimationFrame(() => {
    squareBoardContainer();
    autoFitZoom();
  });
}

export function resetGame() {
  stopAllTimers();
  resetState();
  renderUpgrades();
  renderAchievements();
  newGame();
  startSaveTimer();
  startMpsTimer();
  startAutoClearTimer();
  startAutoFlagTimer();
  updateHUD();
}

export function init() {
  cacheDomRefs();

  setNewGameCallback(newGame);
  setNewGameCallbackForTimers(newGame);
  setNewGameCallbackForPrestige(newGame);
  setFlagModeGetter(getFlagMode);
  setAutoMinerPausedGetter(getAutoMinerPaused);
  setAutoFlaggerPausedGetter(getAutoFlaggerPaused);
  setAutoMinerPausedGetterForUpgrades(getAutoMinerPaused);
  setTileHandlers(onTileClick, onTileRightClick);

  prestigeBtn.addEventListener('click', () => prestige());

  initToolbar();
  initDevPanel();
  initTabs();

  renderUpgrades();
  renderAchievements();

  // Apply offline earnings before first render
  applyOfflineEarnings((amount) => {
    earnMoney(amount);
    saveGame(state);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      newGame();
      startSaveTimer();
      startMpsTimer();
      startAutoClearTimer();
      startAutoFlagTimer();
      updateHUD();
    });
  });
}

function initTabs() {
  const tabBoardBtn       = document.getElementById('tab-board-btn');
  const tabUpgradesBtn    = document.getElementById('tab-upgrades-btn');
  const tabAchievementsBtn = document.getElementById('tab-achievements-btn');
  const tabBoard          = document.getElementById('tab-board');
  const tabUpgrades       = document.getElementById('tab-upgrades');
  const tabAchievements   = document.getElementById('tab-achievements');

  if (!tabBoardBtn || !tabUpgradesBtn || !tabBoard || !tabUpgrades) return;

  function showTab(name: 'board' | 'upgrades' | 'achievements') {
    tabBoard?.classList.toggle('hidden',        name !== 'board');
    tabUpgrades?.classList.toggle('hidden',     name !== 'upgrades');
    tabAchievements?.classList.toggle('hidden', name !== 'achievements');
    tabBoardBtn?.classList.toggle('active',        name === 'board');
    tabUpgradesBtn?.classList.toggle('active',     name === 'upgrades');
    tabAchievementsBtn?.classList.toggle('active', name === 'achievements');

    if (name === 'board') {
      requestAnimationFrame(() => {
        squareBoardContainer();
        autoFitZoom();
      });
    }
    if (name === 'achievements') {
      renderAchievements();
    }
  }

  tabBoardBtn.addEventListener('click', () => showTab('board'));
  tabUpgradesBtn.addEventListener('click', () => showTab('upgrades'));
  tabAchievementsBtn?.addEventListener('click', () => showTab('achievements'));

  window.addEventListener('resize', () => {
    requestAnimationFrame(() => {
      squareBoardContainer();
      autoFitZoom();
    });
  });
}