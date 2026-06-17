import type { GameState, AchievementId } from './types';
import { CONFIG, getBoardDims, getStartingTime } from '../config';
const SAVE_KEY = CONFIG.SAVE_KEY;

const baseDims = getBoardDims(0);

export const DEFAULT_ACHIEVEMENTS: Record<AchievementId, boolean> = {
  first_board:    false,
  boards_10:      false,
  boards_50:      false,
  boards_100:     false,
  boards_500:     false,
  money_1k:       false,
  money_1m:       false,
  money_1b:       false,
  first_prestige: false,
  prestige_5:     false,
  prestige_10:    false,
  first_bot:      false,
  bots_5:         false,
  speed_demon:    false,
  perfect_board:  false,
  offline_earner: false,
};

export const DEFAULT_STATE: GameState = {
  money: CONFIG.money,
  totalMoney: CONFIG.totalMoney,
  boardsCleared: CONFIG.boardsCleared,
  totalBoardsCleared: CONFIG.totalBoardsCleared,
  boardNumber: CONFIG.boardNumber,
  prestigeCount: CONFIG.prestigeCount,
  prestigeMultiplier: CONFIG.prestigeMultiplier,
  phase: 'idle',
  timeLeft: getStartingTime(0),
  upgrades: {
    money_per_tile: 0,
    auto_clear: 0,
    auto_clear_speed: 0,
    auto_flag: 0,
    auto_flag_speed: 0,
    longer_timer: 0,
    board_clear_bonus: 0,
  },
  achievements: { ...DEFAULT_ACHIEVEMENTS },
  cols: baseDims.cols,
  rows: baseDims.rows,
  mineCount: baseDims.mineCount,
  lastSaveTime: Date.now(),
};

export function saveGame(state: GameState): void {
  try {
    const toSave = { ...state, lastSaveTime: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch { /* quota exceeded */ }
}

export function resetGame(): GameState {
  localStorage.removeItem(SAVE_KEY);
  // Also clear old save key
  localStorage.removeItem('incremental_minesweeper_save_v3');
  return { ...DEFAULT_STATE, upgrades: { ...DEFAULT_STATE.upgrades }, achievements: { ...DEFAULT_ACHIEVEMENTS } };
}

export function loadGame(): GameState {
  try {
    // Try current save key first
    let raw = localStorage.getItem(SAVE_KEY);

    // Migrate from v3 if needed
    if (!raw) {
      const oldRaw = localStorage.getItem('incremental_minesweeper_save_v3');
      if (oldRaw) {
        raw = oldRaw;
      }
    }

    if (!raw) return { ...DEFAULT_STATE, upgrades: { ...DEFAULT_STATE.upgrades }, achievements: { ...DEFAULT_ACHIEVEMENTS } };

    const saved = JSON.parse(raw) as Partial<GameState> & { upgrades?: Record<string, number> };

    // Strip removed upgrade 'reveal_area' if present in old save
    const savedUpgrades = { ...(saved.upgrades ?? {}) };
    delete (savedUpgrades as any)['reveal_area'];

    // totalBoardsCleared migration: if old save had none, seed from boardsCleared
    const totalBoardsCleared = (saved as any).totalBoardsCleared
      ?? (saved.boardsCleared ?? 0);

    return {
      ...DEFAULT_STATE,
      ...saved,
      totalBoardsCleared,
      upgrades: { ...DEFAULT_STATE.upgrades, ...savedUpgrades },
      achievements: { ...DEFAULT_ACHIEVEMENTS, ...(saved.achievements ?? {}) },
      phase: 'idle',
      lastSaveTime: (saved as any).lastSaveTime ?? Date.now(),
    };
  } catch {
    return { ...DEFAULT_STATE, upgrades: { ...DEFAULT_STATE.upgrades }, achievements: { ...DEFAULT_ACHIEVEMENTS } };
  }
}

// ---- Formatting helpers ----

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

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}