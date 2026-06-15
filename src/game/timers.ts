import { state, tiles, boardInitialized, setTiles, setBoardInitialized, mpsAccum } from '../state/state';
import { createBoard, floodReveal, getSafeTiles, getMineTiles } from '../board/board';
import { UPGRADE_MAP } from '../upgrades/upgrades';
import { saveGame } from '../state/save';
import { renderBoard, drawCanvas } from '../ui/renderer';
import { updateMineCounter, updateTimerDisplay, updateMpsDisplay, setSmiley, updateHUD } from '../ui/hud';
import { earnMoneyQuiet } from './money';
import { checkWin } from './input';
import { getStartingTime } from '../config';
import { updateUpgradesAffordability } from '../upgrades/upgrades-ui';

// ============================================================
//  TIMERS
// ============================================================

let gameTimer: ReturnType<typeof setInterval> | null = null;
let autoClearTimer: ReturnType<typeof setInterval> | null = null;
let autoFlagTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;
let mpsTimer: ReturnType<typeof setInterval> | null = null;
let renderPending = false;

let _newGame: () => void = () => {};
export function setNewGameCallbackForTimers(fn: () => void) { _newGame = fn; }

let _getAutoMinerPaused: () => boolean = () => false;
export function setAutoMinerPausedGetter(fn: () => boolean) { _getAutoMinerPaused = fn; }

export function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    // Import these at the top of the file
    updateMineCounter();
    updateHUD();
    updateUpgradesAffordability();
    drawCanvas(); // re-draw board if in canvas mode
  });
}

// ---- Game countdown ----

export function startGameTimer() {
  gameTimer = setInterval(() => {
    if (state.phase !== 'playing') return;
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      state.phase = 'lost';
      stopGameTimer();
      setSmiley('😵');
      setTimeout(() => _newGame(), 1500);
    }
  }, 1000);
}

export function stopGameTimer() {
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
}

export function stopAllTimers() {
  stopGameTimer();
  if (autoClearTimer) { clearInterval(autoClearTimer); autoClearTimer = null; }
  if (autoFlagTimer)  { clearInterval(autoFlagTimer);  autoFlagTimer  = null; }
  if (saveTimer)      { clearInterval(saveTimer);      saveTimer      = null; }
  if (mpsTimer)       { clearInterval(mpsTimer);       mpsTimer       = null; }
}

// ---- Auto-start board ----

export function autoStartBoard() {
  if (state.phase === 'playing') return;

  setTiles([]);
  setBoardInitialized(false);
  state.timeLeft = getStartingTime(state.prestigeCount) + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
  state.phase = 'idle';
  setSmiley('🙂');
  updateMineCounter();
  updateTimerDisplay();

  const r = Math.floor(Math.random() * state.rows);
  const c = Math.floor(Math.random() * state.cols);
  setTiles(createBoard(state.rows, state.cols, state.mineCount, r, c));
  setBoardInitialized(true);
  state.phase = 'playing';
  startGameTimer();
  renderBoard();
}

// ---- Auto-clear ----

export function startAutoClearTimer() {
  if (autoClearTimer) clearInterval(autoClearTimer);
  const interval = UPGRADE_MAP['auto_clear_speed'].effect(state.upgrades.auto_clear_speed);
  const tilesPerTick = UPGRADE_MAP['auto_clear'].effect(state.upgrades.auto_clear);

  autoClearTimer = setInterval(() => {
    if (_getAutoMinerPaused()) return;
    if (state.phase === 'idle' || state.phase === 'won' || state.phase === 'lost') {
      autoStartBoard();
      return;
    }
    if (!boardInitialized) return;

    const safe = getSafeTiles(tiles, state.rows, state.cols);
    if (safe.length === 0) return;

    let cleared = 0;
    for (let i = 0; i < Math.min(tilesPerTick, safe.length); i++) {
      const [r, c] = safe[i];
      const revealed = floodReveal(tiles, r, c, state.rows, state.cols);
      // Just mutate state — no DOM touches here
      cleared += revealed.length;
    }

    if (cleared > 0) {
      earnMoneyQuiet(cleared); // see below
      checkWin();
      scheduleRender();        // one rAF for all DOM work
    }
  }, interval);
}

// ---- Auto-flag ----

export function startAutoFlagTimer() {
  if (autoFlagTimer) clearInterval(autoFlagTimer);
  const interval = UPGRADE_MAP['auto_flag_speed'].effect(state.upgrades.auto_flag_speed);
  const flagsPerTick = UPGRADE_MAP['auto_flag'].effect(state.upgrades.auto_flag);

  autoFlagTimer = setInterval(() => {
    if (_getAutoMinerPaused()) return;
    if (state.phase === 'idle' || state.phase === 'won' || state.phase === 'lost') {
      autoStartBoard();
      return;
    }
    if (!boardInitialized) return;

    const mines = getMineTiles(tiles, state.rows, state.cols);
    if (mines.length === 0) return;

    let flagged = 0;
    for (let i = 0; i < Math.min(flagsPerTick, mines.length); i++) {
      tiles[mines[i][0]][mines[i][1]].isFlagged = true;
      flagged++;
    }

    if (flagged > 0) {
      earnMoneyQuiet(flagged);
      scheduleRender();
    }
  }, interval);
}

// ---- MPS ticker ----

let mpsLastSnapshot = 0;

export function startMpsTimer() {
  if (mpsTimer) clearInterval(mpsTimer);
  mpsTimer = setInterval(() => {
    const rate = mpsAccum - mpsLastSnapshot;
    mpsLastSnapshot = mpsAccum;
    updateMpsDisplay(rate);
  }, 1000);
}

export function startSaveTimer() {
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(() => saveGame(state), 10_000);
}