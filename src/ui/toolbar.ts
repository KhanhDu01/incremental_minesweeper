import { flagModeBtn, zoomInBtn, zoomOutBtn, zoomLabel } from './dom';
import { state } from '../state/state';

// ============================================================
//  TOOLBAR
// ============================================================

const ZOOM_STEPS = [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 52, 60];
const ZOOM_DEFAULT_PX = 36;
const ZOOM_DEFAULT_IDX = ZOOM_STEPS.indexOf(ZOOM_DEFAULT_PX);

let zoomIdx = ZOOM_DEFAULT_IDX;
let flagMode = false;

// Track last prestige count so we only auto-fit when prestige actually changes
let lastPrestigeCount = -1;

export function getFlagMode() { return flagMode; }

let autoMinerPaused = false;
export function getAutoMinerPaused() { return autoMinerPaused; }
export function setAutoMinerPaused(val: boolean) { autoMinerPaused = val; }

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
 * Auto-fit zoom only when the board size changes (prestige).
 * Otherwise the zoom level the player set is preserved.
 */
export function autoFitZoom(forceRefit = false) {
  const currentPrestige = state.prestigeCount ?? 0;
  const prestigeChanged = currentPrestige !== lastPrestigeCount;

  if (!forceRefit && !prestigeChanged) {
    // Board size hasn't changed — keep player's zoom
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

function applyZoom() {
  const px = ZOOM_STEPS[zoomIdx];
  document.documentElement.style.setProperty('--tile-size', `${px}px`);

  const boardEl = document.getElementById('board');
  if (boardEl && state.cols && state.rows) {
    boardEl.style.width  = `${state.cols * px}px`;
    boardEl.style.height = `${state.rows * px}px`;
  }

  const pct = Math.round((px / ZOOM_DEFAULT_PX) * 100);
  zoomLabel.textContent = `${pct}%`;
  (zoomOutBtn as HTMLButtonElement).disabled = zoomIdx === 0;
  (zoomInBtn  as HTMLButtonElement).disabled = zoomIdx === ZOOM_STEPS.length - 1;
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