import { flagModeBtn, zoomInBtn, zoomOutBtn, zoomLabel } from './dom';
import { state } from '../state/state';
import { resizeCanvas } from './renderer';

// ============================================================
//  TOOLBAR
// ============================================================

const ZOOM_STEPS = [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 52, 60];
const ZOOM_DEFAULT_PX = 36;
const ZOOM_DEFAULT_IDX = ZOOM_STEPS.indexOf(ZOOM_DEFAULT_PX);

let zoomIdx = ZOOM_DEFAULT_IDX;
let flagMode = false;

// Track last prestige count so we only auto-fit when board size actually changes
let lastPrestigeCount = -1;

export function getFlagMode() { return flagMode; }

let autoMinerPaused = false;
export function getAutoMinerPaused() { return autoMinerPaused; }
export function setAutoMinerPaused(val: boolean) { autoMinerPaused = val; }

let autoFlaggerPaused = false;
export function getAutoFlaggerPaused() { return autoFlaggerPaused; }
export function setAutoFlaggerPaused(val: boolean) { autoFlaggerPaused = val; }

export function initToolbar() {
  flagModeBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    flagModeBtn.textContent = flagMode ? '✏️ Dig' : '🚩 Flag';
    flagModeBtn.classList.toggle('active', flagMode);
    document.body.classList.toggle('flag-mode', flagMode);
  });

  zoomInBtn.addEventListener('click', () => {
    if (zoomIdx < ZOOM_STEPS.length - 1) { zoomIdx++; applyZoom(); }
  });
  zoomOutBtn.addEventListener('click', () => {
    if (zoomIdx > 0) { zoomIdx--; applyZoom(); }
  });

  applyZoom();
}

/**
 * Auto-fit zoom: only recalculates zoom level when the board size changes
 * (prestige or first load). Manual zoom adjustments by the player are preserved
 * between boards.
 */
export function autoFitZoom(forceRefit = false) {
  const currentPrestige = state.prestigeCount ?? 0;
  const prestigeChanged = currentPrestige !== lastPrestigeCount;

  if (!forceRefit && !prestigeChanged) {
    // Board size unchanged — just re-apply current zoom (handles canvas resize after renderBoard)
    applyZoom();
    return;
  }

  lastPrestigeCount = currentPrestige;

  const cols = state.cols ?? 7;
  const rows = state.rows ?? 7;

  const container = document.getElementById('board-container');
  if (!container) return;

  const usableW = container.clientWidth  - 4;
  const usableH = container.clientHeight - 4;

  const maxByWidth  = Math.floor(usableW / cols);
  const maxByHeight = Math.floor(usableH / rows);
  const targetPx    = Math.min(maxByWidth, maxByHeight);

  let best = 0;
  for (let i = 0; i < ZOOM_STEPS.length; i++) {
    if (ZOOM_STEPS[i] <= targetPx) best = i;
  }
  zoomIdx = best;
  applyZoom();
}

/**
 * applyZoom:
 * 1. Sets the CSS custom property (used by DOM tiles and board-header/footer sizing)
 * 2. Calls resizeCanvas so the canvas buffer is immediately rebuilt at the new pixel size
 *    This is the key fix — previously the canvas kept its old baked-in pixel size.
 */
function applyZoom() {
  const px = ZOOM_STEPS[zoomIdx];

  // Update CSS var — DOM tiles and board-header/footer read this
  document.documentElement.style.setProperty('--tile-size', `${px}px`);

  // Update button states and label
  const pct = Math.round((px / ZOOM_DEFAULT_PX) * 100);
  zoomLabel.textContent = `${pct}%`;
  (zoomOutBtn as HTMLButtonElement).disabled = zoomIdx === 0;
  (zoomInBtn  as HTMLButtonElement).disabled = zoomIdx === ZOOM_STEPS.length - 1;

  // Resize the canvas (or DOM board) to match the new tile size.
  // resizeCanvas is a no-op when called before the first renderBoard.
  resizeCanvas(px);
}

export function squareBoardContainer() {
  const boardPanel = document.getElementById('board-panel');
  const container  = document.getElementById('board-container');
  if (!boardPanel || !container) return;

  const availW = boardPanel.clientWidth  - 20;
  const availH = boardPanel.clientHeight - 20;
  const size   = Math.min(availW, availH);
  container.style.width  = `${size}px`;
  container.style.height = `${size}px`;
  document.documentElement.style.setProperty('--board-container-size', `${size}px`);
}