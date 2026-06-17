// ============================================================
//  ACHIEVEMENTS
//  Definitions and unlock logic.
// ============================================================

import type { AchievementId, Achievement } from '../state/types';
import { state } from '../state/state';
import { showToast } from '../ui/hud';
import { UPGRADE_MAP } from '../upgrades/upgrades';
import { EMOJI_ACHIEVEMENT, EMOJI_LOCKED } from '../assets/index';

export { EMOJI_ACHIEVEMENT, EMOJI_LOCKED };

// ---- Achievement definitions ----
export const ACHIEVEMENTS: Achievement[] = [
  // Boards
  { id: 'first_board',    name: 'First Clear',       desc: 'Clear your first board',           icon: '🎯', unlocked: false },
  { id: 'boards_10',      name: 'Getting Started',   desc: 'Clear 10 boards total',            icon: '📋', unlocked: false },
  { id: 'boards_50',      name: 'Seasoned Sweeper',  desc: 'Clear 50 boards total',            icon: '🗂️', unlocked: false },
  { id: 'boards_100',     name: 'Century Club',      desc: 'Clear 100 boards total',           icon: '💯', unlocked: false },
  { id: 'boards_500',     name: 'Minesweeper Pro',   desc: 'Clear 500 boards total',           icon: '🏆', unlocked: false },
  // Money
  { id: 'money_1k',       name: 'Pocket Change',     desc: 'Earn $1,000 total',                icon: '💵', unlocked: false },
  { id: 'money_1m',       name: 'Millionaire',       desc: 'Earn $1,000,000 total',            icon: '💰', unlocked: false },
  { id: 'money_1b',       name: 'Billionaire',       desc: 'Earn $1,000,000,000 total',        icon: '🤑', unlocked: false },
  // Prestige
  { id: 'first_prestige', name: 'Rising Star',       desc: 'Prestige for the first time',      icon: '⭐', unlocked: false },
  { id: 'prestige_5',     name: 'Veteran',           desc: 'Reach prestige level 5',           icon: '🌟', unlocked: false },
  { id: 'prestige_10',    name: 'Legend',            desc: 'Reach prestige level 10',          icon: '💫', unlocked: false },
  // Automation
  { id: 'first_bot',      name: 'Automation Begins', desc: 'Unlock your first auto-miner',     icon: '🤖', unlocked: false },
  { id: 'bots_5',         name: 'Bot Army',          desc: 'Have 5 bots active at once',       icon: '⚙️', unlocked: false },
  { id: 'speed_demon',    name: 'Speed Demon',       desc: 'Reach sub-100ms bot speed',        icon: '⚡', unlocked: false },
  // Special
  { id: 'perfect_board',  name: 'Perfect Run',       desc: 'Clear a board with >50% time left',icon: '✨', unlocked: false },
  { id: 'offline_earner', name: 'While You Slept',   desc: 'Earn money while offline',         icon: '💤', unlocked: false },
];

export const ACHIEVEMENT_MAP: Record<AchievementId, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map(a => [a.id, a])
) as Record<AchievementId, Achievement>;

// ---- Unlock helper ----
function unlock(id: AchievementId) {
  if (state.achievements[id]) return;
  state.achievements[id] = true;
  const ach = ACHIEVEMENT_MAP[id];
  showToast(`${EMOJI_ACHIEVEMENT} Achievement: ${ach.name}!`);
}

// ---- Check all conditions ----
export function checkAchievements() {
  // Boards cleared (total, never resets)
  const total = state.totalBoardsCleared;
  if (total >= 1)   unlock('first_board');
  if (total >= 10)  unlock('boards_10');
  if (total >= 50)  unlock('boards_50');
  if (total >= 100) unlock('boards_100');
  if (total >= 500) unlock('boards_500');

  // Money (lifetime)
  if (state.totalMoney >= 1_000)         unlock('money_1k');
  if (state.totalMoney >= 1_000_000)     unlock('money_1m');
  if (state.totalMoney >= 1_000_000_000) unlock('money_1b');

  // Prestige
  if (state.prestigeCount >= 1)  unlock('first_prestige');
  if (state.prestigeCount >= 5)  unlock('prestige_5');
  if (state.prestigeCount >= 10) unlock('prestige_10');

  // Bots
  const clearBots = state.upgrades.auto_clear > 0
    ? Math.floor(state.upgrades.auto_clear_speed / 10) + 1
    : 0;
  const flagBots = state.upgrades.auto_flag > 0
    ? Math.floor(state.upgrades.auto_flag_speed / 10) + 1
    : 0;
  const totalBots = clearBots + flagBots;
  if (state.upgrades.auto_clear >= 1) unlock('first_bot');
  if (totalBots >= 5) unlock('bots_5');

  // Speed demon: any bot at sub-100ms
  const clearInterval = UPGRADE_MAP['auto_clear_speed'].effect(state.upgrades.auto_clear_speed);
  const flagInterval  = UPGRADE_MAP['auto_flag_speed'].effect(state.upgrades.auto_flag_speed);
  if (clearInterval < 100 || flagInterval < 100) unlock('speed_demon');
}

export function checkPerfectBoard(timeLeft: number, totalTime: number) {
  if (timeLeft / totalTime > 0.5) unlock('perfect_board');
}

export function checkOfflineEarner() {
  unlock('offline_earner');
}