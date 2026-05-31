import type { Upgrade, UpgradeId } from '../types';

export const UPGRADES: Upgrade[] = [
  {
    id: 'money_per_tile',
    name: 'Better Pickaxe',
    icon: '⛏️',
    desc: (lvl) => `$${(lvl + 1)} per tile cleared`,
    baseCost: 25,
    costMultiplier: 1.75,
    maxLevel: 25,
    effect: (lvl) => lvl + 1, // $ per tile
  },
  {
    id: 'board_clear_bonus',
    name: 'Board Bonus',
    icon: '💎',
    desc: (lvl) => `${(lvl + 1) * 25}% board clear bonus`,
    baseCost: 150,
    costMultiplier: 2.0,
    maxLevel: 20,
    effect: (lvl) => (lvl + 1) * 0.25, // multiplier on board clear bonus
  },
  {
    id: 'longer_timer',
    name: 'Overtime',
    icon: '⏰',
    desc: (lvl) => `+${lvl * 5}s timer`,
    baseCost: 100,
    costMultiplier: 2.0,
    maxLevel: 8,
    effect: (lvl) => lvl * 5,
  },
  {
    id: 'reveal_area',
    name: 'Big Shovel',
    icon: '🪣',
    desc: (lvl) => `Reveals ${lvl + 2}x${lvl + 2} area per click`,
    baseCost: 250,
    costMultiplier: 3.2,
    maxLevel: 3,
    effect: (lvl) => lvl + 1, // area radius (1 = 1x1, 2 = 2x2, etc.)
  },
  {
    id: 'auto_flag',
    name: 'Mine Detector',
    icon: '🚩',
    desc: (lvl) => lvl === 0 ? 'Auto-flags mines (still earns $!)' : `Flags ${lvl + 1} mine(s) per tick`,
    baseCost: 400,
    costMultiplier: 2.2,
    maxLevel: 8,
    effect: (lvl) => lvl + 1,
  },
  {
    id: 'auto_flag_speed',
    name: 'Faster Detector',
    icon: '📡',
    desc: (lvl) => `Auto-flags every ${Math.floor(lvl == 0 ? 5000 : 5000 / (Math.sqrt(lvl)))}ms`,
    baseCost: 600,
    costMultiplier: 2.5,
    maxLevel: 9,
    effect: (lvl) => Math.floor(lvl == 0 ? 5000 :5000 / (Math.sqrt(lvl))),
  },
  {
    id: 'auto_clear',
    name: 'Auto-Miner',
    icon: '🤖',
    desc: (lvl) => lvl === 0 ? 'Unlocks auto-clearing safe tiles' : `Auto-clears ${lvl + 1} tile(s) per tick`,
    baseCost: 1000,
    costMultiplier: 2.3,
    maxLevel: 8,
    effect: (lvl) => lvl + 1, // tiles per tick (0 = inactive)
  },
  {
    id: 'auto_clear_speed',
    name: 'Faster Miner',
    icon: '⚡',
    desc: (lvl) => `Auto-clears every ${Math.floor(lvl == 0 ? 5000 : 5000 / (Math.sqrt(lvl)))}ms`,
    baseCost: 1200,
    costMultiplier: 2.4,
    maxLevel: 9,
    effect: (lvl) => Math.floor(lvl == 0 ? 5000 : 5000 / (Math.sqrt(lvl))), // ms interval
  },
];

export const UPGRADE_MAP: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map(u => [u.id, u])
) as Record<UpgradeId, Upgrade>;

export function upgradeCost(upgrade: Upgrade, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}
