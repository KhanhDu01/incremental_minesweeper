import { flagModeBtn, zoomInBtn, zoomOutBtn, zoomLabel } from './dom';
import { state } from '../state/state';

// ============================================================
//  TOOLBAR
// ============================================================

// Tile sizes in px, from smallest to largest
const ZOOM_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 52, 60];
const ZOOM_DEFAULT_PX = 36;
const ZOOM_DEFAULT_IDX = ZOOM_STEPS.indexOf(ZOOM_DEFAULT_PX); // index of 36px

let zoomIdx = ZOOM_DEFAULT_IDX;
let flagMode = false;

export function getFlagMode() { return flagMode; }

// Auto-miner paused state lives here so it can be read by timers without
// going through the DOM. The toggle button is now inside the upgrade item.
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
    const minIdx = getMinZoomIdx();
    if (zoomIdx > minIdx) { zoomIdx--; applyZoom(); }
  });

  applyZoom();
}

/** Clamp zoom index so the board never exceeds ~85vw / 50vh. */
function getMinZoomIdx(): number {
  const cols = state.cols ?? 7;
  const rows = state.rows ?? 7;
  // Target: tile fits within 85vw / cols and 50vh / rows
  const maxByWidth  = Math.floor((window.innerWidth  * 0.85) / cols);
  const maxByHeight = Math.floor((window.innerHeight * 0.50) / rows);
  const maxTilePx   = Math.min(maxByWidth, maxByHeight);

  // Find the largest step that is <= maxTilePx; everything above it is fine,
  // but we want to make sure even the MINIMUM step isn't too large.
  // We want the minimum allowed zoom to be the smallest step that still looks ok.
  // Practically: just return 0 (always allow zooming to 12px).
  return 0;
}

export function autoFitZoom() {
  const cols = state.cols ?? 7;
  const rows = state.rows ?? 7;

  const container = document.getElementById('board-container');
  if (!container) return;

  const usableW = container.clientWidth  - 4;  // subtract border
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

  // Keep board element sized explicitly so it expands horizontally
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
  const tabBoard  = document.getElementById('tab-board');
  const container = document.getElementById('board-container');
  if (!tabBoard || !container) return;

  // Use the tab panel's width as the square size, minus padding
  const size = tabBoard.clientWidth - 20;
  container.style.width  = `${size}px`;
  container.style.height = `${size}px`;
  document.documentElement.style.setProperty('--board-container-size', `${size}px`);
}