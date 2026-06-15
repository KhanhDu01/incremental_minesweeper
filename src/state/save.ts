import type { GameState } from './types';
import { CONFIG, getBoardDims, getStartingTime } from '../config';
const SAVE_KEY = CONFIG.SAVE_KEY;

const baseDims = getBoardDims(0);

export const DEFAULT_STATE: GameState = {
  money: CONFIG.money,
  totalMoney: CONFIG.totalMoney,
  boardsCleared: CONFIG.boardsCleared,
  boardNumber: CONFIG.boardNumber,
  prestigeCount: CONFIG.prestigeCount,
  prestigeMultiplier: CONFIG.prestigeMultiplier,
  phase: 'idle',
  timeLeft: getStartingTime(0),
  upgrades: {
    money_per_tile: 0,
    reveal_area: 0,
    auto_clear: 0,
    auto_clear_speed: 0,
    auto_flag: 0,
    auto_flag_speed: 0,
    longer_timer: 0,
    board_clear_bonus: 0,
  },
  cols: baseDims.cols,
  rows: baseDims.rows,
  mineCount: baseDims.mineCount,
};

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

export function resetGame(): GameState {
  localStorage.removeItem(SAVE_KEY);
  return { ...DEFAULT_STATE, upgrades: { ...DEFAULT_STATE.upgrades } };
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_STATE, upgrades: { ...DEFAULT_STATE.upgrades } };
    const saved = JSON.parse(raw) as Partial<GameState>;
    return {
      ...DEFAULT_STATE,
      ...saved,
      upgrades: { ...DEFAULT_STATE.upgrades, ...(saved.upgrades ?? {}) },
      phase: 'idle',
    };
  } catch {
    return { ...DEFAULT_STATE, upgrades: { ...DEFAULT_STATE.upgrades } };
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