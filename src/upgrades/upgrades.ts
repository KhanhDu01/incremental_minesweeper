import type { Upgrade, UpgradeId } from '../state/types';
import { CONFIG, getTimerUpgradeSecondsPerLevel } from '../config';
import { state } from '../state/state';
import {
  EMOJI_PICKAXE, EMOJI_DIAMOND, EMOJI_TIMER,
  EMOJI_BOT, EMOJI_DETECTOR, EMOJI_RADAR, EMOJI_LIGHTNING,
} from '../assets/index';

// ============================================================
//  UPGRADES
//  Big Shovel (reveal_area) removed.
//  No upgrade max levels — players can keep buying forever.
//  Speed upgrades use the bot system (every BOT_LEVEL_INTERVAL = new bot).
// ============================================================

export const UPGRADES: Upgrade[] = [
  {
    id: 'money_per_tile',
    name: 'Better Pickaxe',
    icon: EMOJI_PICKAXE,
    desc: (lvl) => `$${(lvl + 1)} per tile cleared`,
    baseCost: 20,
    costMultiplier: 1.5,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'board_clear_bonus',
    name: 'Board Bonus',
    icon: EMOJI_DIAMOND,
    desc: (lvl) => `${(lvl + 1) * 25}% board clear bonus (+time bonus)`,
    baseCost: 100,
    costMultiplier: 1.6,
    effect: (lvl) => (lvl + 1) * 0.25,
  },
  {
    id: 'longer_timer',
    name: 'Overtime',
    icon: EMOJI_TIMER,
    desc: (lvl) => {
      const sPerLvl = getTimerUpgradeSecondsPerLevel(state.prestigeCount);
      return `+${lvl * sPerLvl}s timer (+${sPerLvl}s/level)`;
    },
    baseCost: 75,
    costMultiplier: 1.5,
    effect: (lvl) => lvl * getTimerUpgradeSecondsPerLevel(state.prestigeCount),
  },
  {
    id: 'auto_flag',
    name: 'Mine Detector',
    icon: EMOJI_DETECTOR,
    desc: (lvl) => lvl === 0 ? 'Auto-flags mines (still earns $!)' : `Flags ${lvl + 1} mine(s) per tick`,
    baseCost: 300,
    costMultiplier: 1.5,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'auto_flag_speed',
    name: 'Faster Detector',
    icon: EMOJI_RADAR,
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
    icon: EMOJI_BOT,
    desc: (lvl) => lvl === 0 ? 'Unlocks auto-clearing safe tiles' : `Auto-clears ${lvl + 1} tile(s) per tick`,
    baseCost: 600,
    costMultiplier: 2.2,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'auto_clear_speed',
    name: 'Faster Miner',
    icon: EMOJI_LIGHTNING,
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

function autoSpeedMs(speedLvl: number): number {
  return Math.max(0.1, Math.round(5000 * Math.pow(0.65, speedLvl)));
}

export function getBotCount(id: 'auto_clear_speed' | 'auto_flag_speed'): number {
  const lvl = state.upgrades[id];
  if (lvl === 0) return 1;
  return Math.floor(lvl / CONFIG.BOT_LEVEL_INTERVAL) + 1;
}

export const UPGRADE_MAP: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map(u => [u.id, u])
) as Record<UpgradeId, Upgrade>;

export function effectiveMaxLevel(_id: UpgradeId): number {
  return Infinity;
}

export function upgradeCost(upgrade: Upgrade, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}