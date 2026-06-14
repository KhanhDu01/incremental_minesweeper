import type { Upgrade, UpgradeId } from '../types';
import { getEffectiveMaxLevel } from '../../config/config';
import { state } from '../state';

export const UPGRADES: Upgrade[] = [
  {
    id: 'money_per_tile',
    name: 'Better Pickaxe',
    icon: '⛏️',
    desc: (lvl) => `$${(lvl + 1)} per tile cleared`,
    baseCost: 25,
    costMultiplier: 1.75,
    effect: (lvl) => lvl + 1, // $ per tile
  },
  {
    id: 'board_clear_bonus',
    name: 'Board Bonus',
    icon: '💎',
    desc: (lvl) => `${(lvl + 1) * 25}% board clear bonus`,
    baseCost: 150,
    costMultiplier: 2.0,
    effect: (lvl) => (lvl + 1) * 0.25, // multiplier on board clear bonus
  },
  {
    id: 'longer_timer',
    name: 'Overtime',
    icon: '⏰',
    desc: (lvl) => `+${lvl * 5}s timer`,
    baseCost: 100,
    costMultiplier: 2.0,
    effect: (lvl) => lvl * 5,
  },
  {
    id: 'reveal_area',
    name: 'Big Shovel',
    icon: '🪣',
    desc: (lvl) => `Reveals ${lvl + 2}x${lvl + 2} area per click`,
    baseCost: 250,
    costMultiplier: 3.2,
    effect: (lvl) => lvl + 1, // area radius (1 = 1x1, 2 = 2x2, etc.)
  },
  {
    id: 'auto_flag',
    name: 'Mine Detector',
    icon: '🚩',
    desc: (lvl) => lvl === 0 ? 'Auto-flags mines (still earns $!)' : `Flags ${lvl + 1} mine(s) per tick`,
    baseCost: 400,
    costMultiplier: 2.2,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'auto_flag_speed',
    name: 'Faster Detector',
    icon: '📡',
    desc: (lvl) => `Auto-flags every ${Math.floor(5000 / (Math.sqrt(lvl + 1)))}ms`,
    baseCost: 600,
    costMultiplier: 2.5,
    effect: (lvl) => Math.floor(5000 / (Math.sqrt(lvl + 1))),
  },
  {
    id: 'auto_clear',
    name: 'Auto-Miner',
    icon: '🤖',
    desc: (lvl) => lvl === 0 ? 'Unlocks auto-clearing safe tiles' : `Auto-clears ${lvl + 1} tile(s) per tick`,
    baseCost: 1000,
    costMultiplier: 2.3,
    effect: (lvl) => lvl + 1, // tiles per tick (0 = inactive)
  },
  {
    id: 'auto_clear_speed',
    name: 'Faster Miner',
    icon: '⚡',
    desc: (lvl) => `Auto-clears every ${Math.floor(5000 / (Math.sqrt(lvl + 1)))}ms`,
    baseCost: 1200,
    costMultiplier: 2.4,
    effect: (lvl) => Math.floor(5000 / (Math.sqrt(lvl + 1))), // ms interval
  },
];

export const UPGRADE_MAP: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map(u => [u.id, u])
) as Record<UpgradeId, Upgrade>;
 
/** Effective max level for this upgrade given current prestige. */
export function effectiveMaxLevel(_id: UpgradeId): number {
  return getEffectiveMaxLevel(state.prestigeCount);
}
 
export function upgradeCost(upgrade: Upgrade, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

