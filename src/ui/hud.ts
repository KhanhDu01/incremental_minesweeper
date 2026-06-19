import { state, tiles, boardInitialized } from '../state/state';
import { formatMoney, lcdPad } from '../state/save';
import { countFlagged } from '../board/board';
import {
  moneyDisplay, mpsDisplay, boardsDisplay,
  mineCounterEl, timerEl, smileyBtn,
  progressBar, progressLabel,
  prestigeBar, prestigeInfo,
  toastContainer,
} from './dom';
import { CONFIG, calcPrestigeLevelsForBoards, getPrestigeMultiplier } from '../config';
import { EMOJI_PRESTIGE } from '../assets/index';

// ============================================================
//  HUD / DISPLAY UPDATES
// ============================================================

export function updateHUD() {
  moneyDisplay.textContent = formatMoney(state.money);
  boardsDisplay.textContent = `${state.totalBoardsCleared} boards`;
  updateTimerDisplay();
  updateMineCounter();
}

export function updateMpsDisplay(rate: number) {
  mpsDisplay.textContent = formatMoney(rate) + '/s';
}

export function updateMineCounter() {
  const flagged = boardInitialized ? countFlagged(tiles, state.rows, state.cols) : 0;
  mineCounterEl.textContent = lcdPad(state.mineCount - flagged);
}

export function updateTimerDisplay() {
  timerEl.textContent = lcdPad(state.timeLeft);
}

export function setSmiley(emoji: string) {
  smileyBtn.textContent = emoji;
}

export function updatePrestigeBar() {
  // Prestige is now based on TOTAL boards cleared (never resets)
  const earned = calcPrestigeLevelsForBoards(state.boardsCleared);
  const canP   = earned > state.prestigeCount;

  const thresholds = CONFIG.PRESTIGE_THRESHOLDS;
  let nextThreshold = thresholds[thresholds.length - 1][0];
  let nextLevels    = thresholds[thresholds.length - 1][1];

  for (const [req, lvls] of thresholds) {
    if (state.boardsCleared < req) {
      nextThreshold = req;
      nextLevels    = lvls;
      break;
    }
  }

  if (canP) {
    prestigeBar.classList.remove('hidden');
    const levelsGained = earned - state.prestigeCount;
    const newMult = getPrestigeMultiplier(earned);
    const newDims = {
      cols: CONFIG.baseCols + earned * CONFIG.prestigeColsPerLevel,
      rows: CONFIG.baseRows + earned * CONFIG.prestigeRowsPerLevel,
    };
    prestigeInfo.textContent =
      `${EMOJI_PRESTIGE} ${levelsGained > 1 ? `+${levelsGained} prestige levels` : '+1 prestige level'} ready! ` +
      `→ ${newDims.cols}×${newDims.rows} board · x${newMult.toFixed(1)} earnings`;
  } else {
    prestigeBar.classList.add('hidden');
  }

  // Progress bar toward next threshold (based on total boards)
  const pct = Math.min(100, (state.boardsCleared / nextThreshold) * 100);
  progressBar.style.width = `${pct}%`;

  const prestigeText = state.prestigeCount > 0
    ? ` · ${EMOJI_PRESTIGE}${state.prestigeCount} · x${state.prestigeMultiplier.toFixed(1)}`
    : '';
  progressLabel.textContent =
    `Board ${state.boardNumber}${prestigeText} | ${state.boardsCleared}/${nextThreshold} (→+${nextLevels}✨)`;
}

export function showToast(msg: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 400);
  }, 2000);
}