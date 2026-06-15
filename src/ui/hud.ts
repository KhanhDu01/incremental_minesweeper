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
import { CONFIG } from '../config';

// ============================================================
//  HUD / DISPLAY UPDATES
// ============================================================

export function updateHUD() {
  moneyDisplay.textContent = formatMoney(state.money);
  boardsDisplay.textContent = `${state.boardsCleared} boards`;
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
  const required = CONFIG.PRESTIGE_BOARDS_REQUIRED * (state.prestigeCount + 1);
  const canPrestige = state.boardsCleared >= required;

  if (canPrestige) {
    prestigeBar.classList.remove('hidden');
    prestigeInfo.textContent =
      `Prestige ${state.prestigeCount + 1} → ${state.cols + 3}×${state.rows + 2} board, ` +
      `x${(1 + (state.prestigeCount + 1) * 0.5).toFixed(1)} earnings`;
  } else {
    prestigeBar.classList.add('hidden');
  }

  const pct = Math.min(100, (state.boardsCleared / required) * 100);
  progressBar.style.width = `${pct}%`;
  progressLabel.textContent = `Board ${state.boardNumber} | ${state.boardsCleared}/${required} for Prestige`;
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