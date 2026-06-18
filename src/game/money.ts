import { state, addMpsAccum } from '../state/state';
import { UPGRADE_MAP } from '../upgrades/upgrades';
import { updateHUD } from '../ui/hud';
import { updateUpgradesAffordability } from '../upgrades/upgrades-ui';

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

// for bot use — state only, DOM handled by scheduleRender()
export function earnMoneyQuiet(tileCount: number) {
  const amount = calcTileEarnings(tileCount);
  state.money += amount;
  state.totalMoney += amount;
  addMpsAccum(amount);
}