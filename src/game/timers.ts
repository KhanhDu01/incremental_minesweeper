import { state, tiles, boardInitialized, setTiles, setBoardInitialized, commitMpsTick, getMpsRate } from '../state/state';
import { createBoard, floodReveal, getSafeTiles, getMineTiles, shuffleArray } from '../board/board';
import { UPGRADE_MAP, getBotCount } from '../upgrades/upgrades';
import { saveGame } from '../state/save';
import { renderBoard, refreshAllTiles } from '../ui/renderer';
import { updateMineCounter, updateTimerDisplay, updateMpsDisplay, setSmiley, updateHUD } from '../ui/hud';
import { earnMoneyQuiet } from './money';
import { checkWin } from './input';
import { getStartingTime } from '../config';
import { updateUpgradesAffordability } from '../upgrades/upgrades-ui';

// ============================================================
//  TIMERS
// ============================================================

let gameTimer: ReturnType<typeof setInterval> | null = null;
let autoClearTimers: ReturnType<typeof setInterval>[] = [];
let autoFlagTimers:  ReturnType<typeof setInterval>[] = [];
let saveTimer: ReturnType<typeof setInterval> | null = null;
let mpsTimer:  ReturnType<typeof setInterval> | null = null;
let renderPending = false;

// Guards against bot + timeout both calling newGame after a win/loss
let boardTransitioning = false;
export function setBoardTransitioning(val: boolean) { boardTransitioning = val; }
export function isBoardTransitioning() { return boardTransitioning; }

let _newGame: () => void = () => {};
export function setNewGameCallbackForTimers(fn: () => void) { _newGame = fn; }

let _getAutoMinerPaused: () => boolean = () => false;
export function setAutoMinerPausedGetter(fn: () => boolean) { _getAutoMinerPaused = fn; }

export function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    updateMineCounter();
    updateHUD();
    updateUpgradesAffordability();
    refreshAllTiles();
  });
}

// ---- Game countdown ----

export function startGameTimer() {
  if (gameTimer) clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    if (state.phase !== 'playing') return;
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      state.phase = 'lost';
      stopGameTimer();
      setSmiley('😵');
      boardTransitioning = true;
      setTimeout(() => {
        boardTransitioning = false;
        _newGame();
      }, 1500);
    }
  }, 1000);
}

export function stopGameTimer() {
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
}

export function stopAllTimers() {
  stopGameTimer();
  stopAutoClearTimers();
  stopAutoFlagTimers();
  if (saveTimer) { clearInterval(saveTimer); saveTimer = null; }
  if (mpsTimer)  { clearInterval(mpsTimer);  mpsTimer  = null; }
}

function stopAutoClearTimers() {
  autoClearTimers.forEach(t => clearInterval(t));
  autoClearTimers = [];
}

function stopAutoFlagTimers() {
  autoFlagTimers.forEach(t => clearInterval(t));
  autoFlagTimers = [];
}

// ---- Bot first-click: safe center tile, flood-reveals like player ----

let botLastClearPos: [number, number] | null = null;

export function autoStartBoard() {
  if (boardTransitioning) return;
  if (state.phase === 'playing') return;

  boardTransitioning = true;
  setTiles([]);
  setBoardInitialized(false);
  state.timeLeft = getStartingTime(state.prestigeCount) + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
  state.phase = 'idle';
  setSmiley('🙂');
  updateMineCounter();
  updateTimerDisplay();

  // Pick the center tile as the safe starting point
  const r = Math.floor(state.rows / 2);
  const c = Math.floor(state.cols / 2);

  setTiles(createBoard(state.rows, state.cols, state.mineCount, r, c));
  setBoardInitialized(true);
  state.phase = 'playing';
  startGameTimer();

  // Flood-reveal from center (same as player first click)
  const revealed = floodReveal(tiles, r, c, state.rows, state.cols);
  if (revealed.length > 0) earnMoneyQuiet(revealed.length);
  botLastClearPos = [r, c];

  renderBoard();
  boardTransitioning = false;
}

// ---- Auto-clear (supports multiple bots) ----
// Subsequent bot clears happen near the last cleared position

export function startAutoClearTimer() {
  stopAutoClearTimers();

  const clearLevel = state.upgrades.auto_clear;
  if (clearLevel === 0) return;

  const interval     = UPGRADE_MAP['auto_clear_speed'].effect(state.upgrades.auto_clear_speed);
  const tilesPerTick = UPGRADE_MAP['auto_clear'].effect(clearLevel);
  const botCount     = state.upgrades.auto_clear_speed > 0
    ? getBotCount('auto_clear_speed')
    : 1;

  for (let bot = 0; bot < botCount; bot++) {
    const t = setInterval(() => {
      if (_getAutoMinerPaused()) return;

      if (state.phase === 'idle' || state.phase === 'won' || state.phase === 'lost') {
        if (bot === 0) autoStartBoard();
        return;
      }
      if (!boardInitialized) return;

      const safe = getSafeTiles(tiles, state.rows, state.cols);
      if (safe.length === 0) return;

      // Sort safe tiles by proximity to last cleared position so bots
      // expand outward from where they last worked.
      let candidates = safe;
      if (botLastClearPos) {
        const [lr, lc] = botLastClearPos;
        candidates = [...safe].sort((a, b) => {
          const da = Math.abs(a[0] - lr) + Math.abs(a[1] - lc);
          const db = Math.abs(b[0] - lr) + Math.abs(b[1] - lc);
          return da - db;
        });
      }

      let cleared = 0;
      for (let i = 0; i < Math.min(tilesPerTick, candidates.length); i++) {
        const [r, c] = candidates[i];
        const revealed = floodReveal(tiles, r, c, state.rows, state.cols);
        if (revealed.length > 0) {
          cleared += revealed.length;
          botLastClearPos = [r, c];
        }
      }

      if (cleared > 0) {
        earnMoneyQuiet(cleared);
        checkWin();
        scheduleRender();
      }
    }, interval);

    autoClearTimers.push(t);
  }
}

// ---- Auto-flag (supports multiple bots, random placement) ----

export function startAutoFlagTimer() {
  stopAutoFlagTimers();

  const flagLevel = state.upgrades.auto_flag;
  if (flagLevel === 0) return;

  const interval     = UPGRADE_MAP['auto_flag_speed'].effect(state.upgrades.auto_flag_speed);
  const flagsPerTick = UPGRADE_MAP['auto_flag'].effect(flagLevel);
  const botCount     = state.upgrades.auto_flag_speed > 0
    ? getBotCount('auto_flag_speed')
    : 1;

  for (let bot = 0; bot < botCount; bot++) {
    const t = setInterval(() => {
      if (_getAutoMinerPaused()) return;

      if (state.phase === 'idle' || state.phase === 'won' || state.phase === 'lost') {
        if (bot === 0) autoStartBoard();
        return;
      }
      if (!boardInitialized) return;

      const mines = getMineTiles(tiles, state.rows, state.cols);
      if (mines.length === 0) return;

      // Random flag placement — shuffle so bots don't always flag the same mines first
      const shuffled = shuffleArray([...mines]);

      let flagged = 0;
      for (let i = 0; i < Math.min(flagsPerTick, shuffled.length); i++) {
        tiles[shuffled[i][0]][shuffled[i][1]].isFlagged = true;
        flagged++;
      }

      if (flagged > 0) {
        earnMoneyQuiet(flagged);
        scheduleRender();
      }
    }, interval);

    autoFlagTimers.push(t);
  }
}

// ---- MPS ticker — 5-second rolling average ----

export function startMpsTimer() {
  if (mpsTimer) clearInterval(mpsTimer);
  mpsTimer = setInterval(() => {
    commitMpsTick();
    const rate = getMpsRate();
    updateMpsDisplay(rate);
  }, 1000);
}

export function startSaveTimer() {
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(() => saveGame(state), 10_000);
}