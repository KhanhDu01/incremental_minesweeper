import { state, tiles, boardInitialized, setTiles, setBoardInitialized, mpsAccum } from '../state';
import { createBoard, floodReveal, getSafeTiles, getMineTiles } from '../components/board';
import { UPGRADE_MAP } from '../components/upgrades';
import { saveGame } from '../save';
import { renderBoard, refreshTile, getTileEl, updateTileElement } from '../renderer/renderer';
import { updateMineCounter, updateTimerDisplay, updateMpsDisplay, setSmiley } from '../hud';
import { calcTileEarnings, earnMoney } from '../components/money';
import { checkWin } from '../input';
import { CONFIG } from '../../config/config';

// ============================================================
//  TIMERS
// ============================================================

let gameTimer: ReturnType<typeof setInterval> | null = null;
let autoClearTimer: ReturnType<typeof setInterval> | null = null;
let autoFlagTimer: ReturnType<typeof setInterval> | null = null;

// Injected from game.ts to avoid circular deps
let _newGame: () => void = () => {};
export function setNewGameCallbackForTimers(fn: () => void) { _newGame = fn; }

// Injected from toolbar.ts
let _getAutoMinerPaused: () => boolean = () => false;
export function setAutoMinerPausedGetter(fn: () => boolean) { _getAutoMinerPaused = fn; }

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
  if (autoFlagTimer) { clearInterval(autoFlagTimer); autoFlagTimer = null; }
}

// ---- Auto-start a board on behalf of the player ----

export function autoStartBoard() {
  if (state.phase === 'playing') return;

  setTiles([]);
  setBoardInitialized(false);
  state.timeLeft = CONFIG.timeLeft + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
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
      revealed.forEach(([tr, tc]) => {
        const el = getTileEl(tr, tc);
        if (el) {
          updateTileElement(el, tiles[tr][tc]);
          el.classList.add('auto-cleared');
          setTimeout(() => el.classList.remove('auto-cleared'), 300);
        }
      });
      cleared += revealed.length;
    }

    if (cleared > 0) {
      earnMoney(calcTileEarnings(cleared));
      updateMineCounter();
      checkWin();
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
      const [r, c] = mines[i];
      tiles[r][c].isFlagged = true;
      refreshTile(r, c);
      flagged++;
    }

    if (flagged > 0) {
      earnMoney(calcTileEarnings(flagged));
      updateMineCounter();
    }
  }, interval);
}

// ---- MPS ticker ----

let mpsLastSnapshot = 0;

export function startMpsTimer() {
  setInterval(() => {
    const rate = mpsAccum - mpsLastSnapshot;
    mpsLastSnapshot = mpsAccum;
    updateMpsDisplay(rate);
  }, 1000);
}

// ---- Autosave ----

export function startSaveTimer() {
  setInterval(() => saveGame(state), 10_000);
}
