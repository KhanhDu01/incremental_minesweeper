import type { Upgrade, UpgradeId } from '../state/types';
import { getEffectiveMaxLevel } from '../config';
import { state } from '../state/state';

// ============================================================
//  UPGRADES
//
//  Cost philosophy:
//  - costMultiplier ≤ 1.5 for most upgrades (vs old 1.75–3.2)
//  - Speed upgrades use additive cost steps instead of exponential
//    so they stay purchaseable without breaking the bank
//  - Board/automation upgrades slightly pricier than income ones
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
    desc: (lvl) => `+${lvl * 5}s timer`,
    baseCost: 75,
    costMultiplier: 1.5,
    effect: (lvl) => lvl * 5,
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
    // Linear cost steps: 200, 400, 600, 800 … much more gradual than exponential
    desc: (lvl) => `Auto-flags every ${autoSpeedMs(lvl)}ms`,
    baseCost: 200,
    costMultiplier: 1.35,
    effect: (lvl) => autoSpeedMs(lvl),
  },
  {
    id: 'auto_clear',
    name: 'Auto-Miner',
    icon: '🤖',
    desc: (lvl) => lvl === 0 ? 'Unlocks auto-clearing safe tiles' : `Auto-clears ${lvl + 1} tile(s) per tick`,
    baseCost: 600,
    costMultiplier: 1.5,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'auto_clear_speed',
    name: 'Faster Miner',
    icon: '⚡',
    desc: (lvl) => `Auto-clears every ${autoSpeedMs(lvl)}ms`,
    baseCost: 400,
    costMultiplier: 1.35,
    effect: (lvl) => autoSpeedMs(lvl),
  },
];

/**
  * Speed curve for auto timers.
 * Each level multiplies the interval by 0.65 (35% faster per level).
 * Level 0: 5000ms, 1: 3250ms, 2: 2112ms, 3: 1373ms, 4: 893ms,
 * 5: 580ms, 6: 377ms, 7: 245ms, 8: 159ms, 9: 103ms, 10: 67ms ...
 * No hard floor — it keeps getting faster, just with diminishing returns.
 */
function autoSpeedMs(lvl: number): number {
  return Math.max(1, Math.round(5000 * Math.pow(0.65, lvl)));
}

export const UPGRADE_MAP: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map(u => [u.id, u])
) as Record<UpgradeId, Upgrade>;

export function effectiveMaxLevel(_id: UpgradeId): number {
  return getEffectiveMaxLevel(state.prestigeCount);
}

export function upgradeCost(upgrade: Upgrade, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}