import { state, tiles, boardInitialized, setTiles, setBoardInitialized, commitMpsTick, getMpsRate } from '../state/state';
import { createBoard, floodReveal, getSafeTilesFromIndex, getMineTilesFromIndex, getNearestSafeTiles, shuffleArray } from '../board/board';
import { safeTileIndex, mineTileIndex, indexMarkFlagged } from '../state/tile-index';
import { UPGRADE_MAP, getBotCount } from '../upgrades/upgrades';
import { saveGame } from '../state/save';
import { renderBoard, markTileDirty, flushDirtyTiles } from '../ui/renderer';
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

let boardTransitioning = false;
export function setBoardTransitioning(val: boolean) { boardTransitioning = val; }
export function isBoardTransitioning() { return boardTransitioning; }

let _newGame: () => void = () => {};
export function setNewGameCallbackForTimers(fn: () => void) { _newGame = fn; }

let _getAutoMinerPaused: () => boolean = () => false;
export function setAutoMinerPausedGetter(fn: () => boolean) { _getAutoMinerPaused = fn; }

let _getAutoFlaggerPaused: () => boolean = () => false;
export function setAutoFlaggerPausedGetter(fn: () => boolean) { _getAutoFlaggerPaused = fn; }

// scheduleRender now uses partial redraws via flushDirtyTiles.
// updateUpgradesAffordability re-renders every upgrade card — expensive.
// We throttle it to at most once every 500ms to avoid UI lockup at high bot speeds.
//
// IMPORTANT: requestAnimationFrame can be throttled/paused by the browser for
// content inside a display:none ancestor (e.g. the board tab while the
// Upgrades/Achievements tab is active). That caused bot updates to silently
// stop landing until something else (like a tab switch) forced a new frame.
// We drive the actual flush with setTimeout — which keeps firing regardless
// of tab visibility — and use rAF only as a best-effort paint hint when the
// board tab happens to be visible.
let lastAffordabilityUpdate = 0;

function flushRender() {
  renderPending = false;
  updateMineCounter();
  updateHUD();
  const now = Date.now();
  if (now - lastAffordabilityUpdate > 500) {
    lastAffordabilityUpdate = now;
    updateUpgradesAffordability();
  }
  flushDirtyTiles(); // only redraws changed tiles
}

export function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  // setTimeout(0) is not subject to the same visibility-based throttling
  // that requestAnimationFrame can receive inside hidden tab panels.
  setTimeout(flushRender, 0);
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
      setTimeout(() => { boardTransitioning = false; _newGame(); }, 1500);
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

let botLastClearKey: number = -1; // encoded r*cols+c

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

  const r = Math.floor(state.rows / 2);
  const c = Math.floor(state.cols / 2);

  setTiles(createBoard(state.rows, state.cols, state.mineCount, r, c));
  setBoardInitialized(true);
  state.phase = 'playing';
  startGameTimer();

  // Flood-reveal from center — index is already updated inside floodReveal
  const revealed = floodReveal(tiles, r, c, state.rows, state.cols);
  if (revealed.length > 0) earnMoneyQuiet(revealed.length);
  botLastClearKey = r * state.cols + c;

  renderBoard();
  boardTransitioning = false;
}

// ---- Auto-clear ----
// Uses index-based lookups — O(tilesPerTick) not O(rows*cols).
// Proximity sort: pull candidate keys near botLastClearKey from the Set,
// sort only those (small sample), avoiding sorting the entire safe set.


export function startAutoClearTimer() {
  stopAutoClearTimers();

  const clearLevel = state.upgrades.auto_clear;
  if (clearLevel === 0) return;

  const interval     = UPGRADE_MAP['auto_clear_speed'].effect(state.upgrades.auto_clear_speed);
  const tilesPerTick = UPGRADE_MAP['auto_clear'].effect(clearLevel);
  const botCount     = state.upgrades.auto_clear_speed > 0 ? getBotCount('auto_clear_speed') : 1;

  for (let bot = 0; bot < botCount; bot++) {
    const t = setInterval(() => {
      if (_getAutoMinerPaused()) return;

      if (state.phase === 'idle' || state.phase === 'won' || state.phase === 'lost') {
        if (bot === 0) autoStartBoard();
        return;
      }
      if (!boardInitialized) return;
      if (safeTileIndex.size === 0) return;

      const cols = state.cols;
      const rows = state.rows;

      // Get the nearest safe tiles to the last cleared position.
      // getNearestSafeTiles uses an expanding radius search so it actually
      // finds tiles spatially close to the frontier, not a random Set slice.
      let candidates: [number, number][];
      if (botLastClearKey >= 0) {
        const lr = Math.floor(botLastClearKey / cols);
        const lc = botLastClearKey % cols;
        candidates = getNearestSafeTiles(lr, lc, rows, cols, tilesPerTick);
      } else {
        candidates = getSafeTilesFromIndex(cols, tilesPerTick);
      }

      let cleared = 0;
      const dirtyCoords: [number, number][] = [];
      for (let i = 0; i < Math.min(tilesPerTick, candidates.length); i++) {
        const [r, c] = candidates[i];
        const revealed = floodReveal(tiles, r, c, state.rows, state.cols);
        if (revealed.length > 0) {
          cleared += revealed.length;
          botLastClearKey = r * cols + c;
          for (const [tr, tc] of revealed) dirtyCoords.push([tr, tc]);
        }
      }

      if (cleared > 0) {
        earnMoneyQuiet(cleared);
        // Mark only changed tiles dirty instead of refreshAllTiles
        for (const [tr, tc] of dirtyCoords) markTileDirty(tr, tc);
        checkWin();
        scheduleRender();
      }
    }, interval);

    autoClearTimers.push(t);
  }
}

// ---- Auto-flag ----
// Uses index-based lookups and random sampling from the Set.

export function startAutoFlagTimer() {
  stopAutoFlagTimers();

  const flagLevel = state.upgrades.auto_flag;
  if (flagLevel === 0) return;

  const interval     = UPGRADE_MAP['auto_flag_speed'].effect(state.upgrades.auto_flag_speed);
  const flagsPerTick = UPGRADE_MAP['auto_flag'].effect(flagLevel);
  const botCount     = state.upgrades.auto_flag_speed > 0 ? getBotCount('auto_flag_speed') : 1;

  for (let bot = 0; bot < botCount; bot++) {
    const t = setInterval(() => {
      if (_getAutoFlaggerPaused()) return;

      if (state.phase === 'idle' || state.phase === 'won' || state.phase === 'lost') {
        if (bot === 0) autoStartBoard();
        return;
      }
      if (!boardInitialized) return;
      if (mineTileIndex.size === 0) return;

      const cols = state.cols;
      const mines = getMineTilesFromIndex(cols, flagsPerTick * 4);
      const shuffled = shuffleArray(mines).slice(0, flagsPerTick);

      let flagged = 0;
      const dirtyCoords: [number, number][] = [];
      for (const [r, c] of shuffled) {
        const tile = tiles[r][c];
        if (tile.isFlagged || tile.isRevealed) continue;
        tile.isFlagged = true;
        indexMarkFlagged(r * cols + c, tile.isMine);
        flagged++;
        dirtyCoords.push([r, c]);
      }

      if (flagged > 0) {
        earnMoneyQuiet(flagged);
        for (const [tr, tc] of dirtyCoords) markTileDirty(tr, tc);
        // Win condition now requires all mines flagged — check after each flag batch
        checkWin();
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