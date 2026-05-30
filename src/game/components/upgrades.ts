import type { Upgrade, UpgradeId } from '../types';

export const UPGRADES: Upgrade[] = [
  {
    id: 'money_per_tile',
    name: 'Better Pickaxe',
    icon: '⛏️',
    desc: (lvl) => `$${(lvl + 1)} per tile cleared`,
    baseCost: 50,
    costMultiplier: 2.2,
    maxLevel: 20,
    effect: (lvl) => lvl + 1, // $ per tile
  },
  {
    id: 'board_clear_bonus',
    name: 'Board Bonus',
    icon: '💎',
    desc: (lvl) => `${(lvl + 1) * 100}% board clear bonus`,
    baseCost: 200,
    costMultiplier: 2.5,
    maxLevel: 15,
    effect: (lvl) => (lvl + 1) * 1, // multiplier on board clear bonus
  },
  {
    id: 'reveal_area',
    name: 'Big Shovel',
    icon: '🪣',
    desc: (lvl) => `Reveals ${lvl + 1}x${lvl + 1} area per click`,
    baseCost: 150,
    costMultiplier: 3.5,
    maxLevel: 4,
    effect: (lvl) => lvl + 1, // area radius (1 = 1x1, 2 = 2x2, etc.)
  },
  {
    id: 'auto_clear',
    name: 'Auto-Miner',
    icon: '🤖',
    desc: (lvl) => lvl === 0 ? 'Unlocks auto-clearing safe tiles' : `Auto-clears ${lvl} tile(s) per tick`,
    baseCost: 500,
    costMultiplier: 2.8,
    maxLevel: 10,
    effect: (lvl) => lvl, // tiles per tick (0 = inactive)
  },
  {
    id: 'auto_clear_speed',
    name: 'Faster Miner',
    icon: '⚡',
    desc: (lvl) => `Auto-clears every ${Math.max(100, 1000 - lvl * 100)}ms`,
    baseCost: 800,
    costMultiplier: 2.5,
    maxLevel: 9,
    effect: (lvl) => Math.max(100, 1000 - lvl * 100), // ms interval
  },
  {
    id: 'auto_flag',
    name: 'Mine Detector',
    icon: '🚩',
    desc: (lvl) => lvl === 0 ? 'Auto-flags mines (still earns $!)' : `Flags ${lvl} mine(s) per tick`,
    baseCost: 1200,
    costMultiplier: 3.0,
    maxLevel: 10,
    effect: (lvl) => lvl,
  },
  {
    id: 'auto_flag_speed',
    name: 'Faster Detector',
    icon: '📡',
    desc: (lvl) => `Auto-flags every ${Math.max(100, 1000 - lvl * 100)}ms`,
    baseCost: 2000,
    costMultiplier: 2.5,
    maxLevel: 9,
    effect: (lvl) => Math.max(100, 1000 - lvl * 100),
  },
  {
    id: 'longer_timer',
    name: 'Overtime',
    icon: '⏰',
    desc: (lvl) => `+${lvl * 30}s timer`,
    baseCost: 300,
    costMultiplier: 2.0,
    maxLevel: 10,
    effect: (lvl) => lvl * 30,
  },
];

export const UPGRADE_MAP: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map(u => [u.id, u])
) as Record<UpgradeId, Upgrade>;

export function upgradeCost(upgrade: Upgrade, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}
