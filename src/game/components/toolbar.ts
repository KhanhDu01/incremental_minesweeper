import { flagModeBtn, autoMinerToggle, zoomInBtn, zoomOutBtn, zoomLabel } from '../dom';
import { updateAutoMinerToggle } from '../hud';

// ============================================================
//  TOOLBAR
// ============================================================

const ZOOM_STEPS = [20, 24, 28, 32, 36, 40, 44, 52, 60];
const ZOOM_DEFAULT_IDX = 4; // 36px = 100%
let zoomIdx = ZOOM_DEFAULT_IDX;

let flagMode = false;
let autoMinerPaused = false;

export function getFlagMode() { return flagMode; }
export function getAutoMinerPaused() { return autoMinerPaused; }

export function initToolbar() {
  flagModeBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    flagModeBtn.textContent = flagMode ? '✏️ Dig' : '🚩 Flag';
    flagModeBtn.classList.toggle('active', flagMode);
    document.body.classList.toggle('flag-mode', flagMode);
  });

  autoMinerToggle.addEventListener('click', () => {
    autoMinerPaused = !autoMinerPaused;
    updateAutoMinerToggle(autoMinerPaused);
  });

  zoomInBtn.addEventListener('click', () => {
    if (zoomIdx < ZOOM_STEPS.length - 1) { zoomIdx++; applyZoom(); }
  });
  zoomOutBtn.addEventListener('click', () => {
    if (zoomIdx > 0) { zoomIdx--; applyZoom(); }
  });

  applyZoom();
}

function applyZoom() {
  const px = ZOOM_STEPS[zoomIdx];
  document.documentElement.style.setProperty('--tile-size', `${px}px`);
  const pct = Math.round((px / ZOOM_STEPS[ZOOM_DEFAULT_IDX]) * 100);
  zoomLabel.textContent = `${pct}%`;
  (zoomOutBtn as HTMLButtonElement).disabled = zoomIdx === 0;
  (zoomInBtn as HTMLButtonElement).disabled = zoomIdx === ZOOM_STEPS.length - 1;
}
