import { state, addMpsAccum } from '../state';
import { UPGRADE_MAP } from './upgrades';
import { updateHUD } from '../hud';
import { updateUpgradesAffordability } from '../renderer/upgrades-ui';

// ============================================================
//  MONEY
// ============================================================

export function calcTileEarnings(tileCount: number): number {
  const rate = UPGRADE_MAP['money_per_tile'].effect(state.upgrades.money_per_tile);
  return Math.floor(tileCount * rate * state.prestigeMultiplier);
}

export function earnMoney(amount: number) {
  state.money += amount;
  state.totalMoney += amount;
  addMpsAccum(amount);
  updateHUD();
  updateUpgradesAffordability();
}
