import type { Upgrade, UpgradeId } from '../state/types';
import { CONFIG, getTimerUpgradeSecondsPerLevel } from '../config';
import { state } from '../state/state';

// ============================================================
//  UPGRADES
//
//  No upgrade max levels — players can keep buying forever.
//  Exception: auto_clear_speed / auto_flag_speed use a "bot" system:
//    every BOT_LEVEL_INTERVAL levels, a new bot is added and
//    the speed resets to 5000ms. The effective interval per bot
//    is still a function of (level % BOT_LEVEL_INTERVAL).
// ============================================================

export const UPGRADES: Upgrade[] = [
  {
    id: 'money_per_tile',
    name: 'Better Pickaxe',
    icon: '⛏️',
    desc: (lvl) => `$${(lvl + 1)} per tile cleared`,
    baseCost: 20,
    costMultiplier: 1.5,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'board_clear_bonus',
    name: 'Board Bonus',
    icon: '💎',
    desc: (lvl) => `${(lvl + 1) * 25}% board clear bonus`,
    baseCost: 100,
    costMultiplier: 1.6,
    effect: (lvl) => (lvl + 1) * 0.25,
  },
  {
    id: 'longer_timer',
    name: 'Overtime',
    icon: '⏰',
    // Seconds per level is dynamic — call getTimerUpgradeSecondsPerLevel at runtime
    desc: (lvl) => {
      const sPerLvl = getTimerUpgradeSecondsPerLevel(state.prestigeCount);
      return `+${lvl * sPerLvl}s timer (+${sPerLvl}s/level)`;
    },
    baseCost: 75,
    costMultiplier: 1.5,
    effect: (lvl) => lvl * getTimerUpgradeSecondsPerLevel(state.prestigeCount),
  },
  {
    id: 'reveal_area',
    name: 'Big Shovel',
    icon: '🪣',
    desc: (lvl) => `Reveals ${lvl + 2}x${lvl + 2} area per click`,
    baseCost: 200,
    costMultiplier: 1.8,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'auto_flag',
    name: 'Mine Detector',
    icon: '🚩',
    desc: (lvl) => lvl === 0 ? 'Auto-flags mines (still earns $!)' : `Flags ${lvl + 1} mine(s) per tick`,
    baseCost: 300,
    costMultiplier: 1.5,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'auto_flag_speed',
    name: 'Faster Detector',
    icon: '📡',
    desc: (lvl) => {
      const bots = Math.floor(lvl / CONFIG.BOT_LEVEL_INTERVAL) + 1;
      const speedLvl = lvl % CONFIG.BOT_LEVEL_INTERVAL;
      return `${bots} bot${bots > 1 ? 's' : ''} @ ${autoSpeedMs(speedLvl)}ms`;
    },
    baseCost: 200,
    costMultiplier: 1.35,
    effect: (lvl) => {
      const speedLvl = lvl % CONFIG.BOT_LEVEL_INTERVAL;
      return autoSpeedMs(speedLvl);
    },
  },
  {
    id: 'auto_clear',
    name: 'Auto-Miner',
    icon: '🤖',
    desc: (lvl) => lvl === 0 ? 'Unlocks auto-clearing safe tiles' : `Auto-clears ${lvl + 1} tile(s) per tick`,
    baseCost: 600,
    costMultiplier: 2.2,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'auto_clear_speed',
    name: 'Faster Miner',
    icon: '⚡',
    desc: (lvl) => {
      const bots = Math.floor(lvl / CONFIG.BOT_LEVEL_INTERVAL) + 1;
      const speedLvl = lvl % CONFIG.BOT_LEVEL_INTERVAL;
      return `${bots} bot${bots > 1 ? 's' : ''} @ ${autoSpeedMs(speedLvl)}ms`;
    },
    baseCost: 400,
    costMultiplier: 1.5,
    effect: (lvl) => {
      const speedLvl = lvl % CONFIG.BOT_LEVEL_INTERVAL;
      return autoSpeedMs(speedLvl);
    },
  },
];

/**
 * Speed curve for auto timers (per bot).
 * Level 0 (new bot): 5000ms, then speeds up each level.
 * Resets every BOT_LEVEL_INTERVAL levels when a new bot is added.
 */
function autoSpeedMs(speedLvl: number): number {
  return Math.max(50, Math.round(5000 * Math.pow(0.65, speedLvl)));
}

export function getBotCount(id: 'auto_clear_speed' | 'auto_flag_speed'): number {
  const lvl = state.upgrades[id];
  if (lvl === 0) return 1; // default 1 bot at base speed
  return Math.floor(lvl / CONFIG.BOT_LEVEL_INTERVAL) + 1;
}

export const UPGRADE_MAP: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map(u => [u.id, u])
) as Record<UpgradeId, Upgrade>;

/** No hard max for most upgrades — returns Infinity.
 *  Speed upgrades also have no hard cap now (bot system handles it). */
export function effectiveMaxLevel(_id: UpgradeId): number {
  return Infinity;
}

export function upgradeCost(upgrade: Upgrade, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}