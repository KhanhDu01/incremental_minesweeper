import type { GameState } from './types';
import { CONFIG } from '../config/config';
const SAVE_KEY = 'minesweeper_inc_save';

export const DEFAULT_STATE: GameState = {
  money: CONFIG.money,
  totalMoney: CONFIG.totalMoney,
  boardsCleared: CONFIG.boardsCleared,
  boardNumber: CONFIG.boardNumber,
  prestigeCount: CONFIG.prestigeCount,
  prestigeMultiplier: CONFIG.prestigeMultiplier,
  phase: 'idle',
  timeLeft: CONFIG.timeLeft,
  upgrades: {
    money_per_tile: CONFIG.upgrades.money_per_tile,
    reveal_area: CONFIG.upgrades.reveal_area,
    auto_clear: CONFIG.upgrades.auto_clear,
    auto_clear_speed: CONFIG.upgrades.auto_clear_speed,
    auto_flag: CONFIG.upgrades.auto_flag,
    auto_flag_speed: CONFIG.upgrades.auto_flag_speed,
    longer_timer: CONFIG.upgrades.longer_timer,
    board_clear_bonus: CONFIG.upgrades.board_clear_bonus,
  },
  cols: CONFIG.cols,
  rows: CONFIG.rows,
  mineCount: CONFIG.mineCount,
};

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded, ignore */ }
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const saved = JSON.parse(raw) as Partial<GameState>;
    // Merge to handle new fields in future updates
    return {
      ...DEFAULT_STATE,
      ...saved,
      upgrades: { ...DEFAULT_STATE.upgrades, ...(saved.upgrades ?? {}) },
      phase: 'idle', // always start idle
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function formatMoney(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.floor(n)}`;
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function lcdPad(n: number): string {
  return String(Math.max(0, Math.min(999, n))).padStart(3, '0');
}
