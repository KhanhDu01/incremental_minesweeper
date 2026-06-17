// ============================================================
//  OFFLINE EARNINGS
//  Calculates and applies income earned while the tab was closed.
// ============================================================

import { state } from '../state/state';
import { CONFIG } from '../config';
import { UPGRADE_MAP, getBotCount } from '../upgrades/upgrades';
import { formatMoney, formatDuration } from '../state/save';
import { showToast } from '../ui/hud';
import { checkOfflineEarner } from './achievements';
import { EMOJI_OFFLINE } from '../assets/index';

/**
 * Estimate per-second earnings based on current upgrade levels.
 * This uses a simplified model: auto-miners + auto-flaggers contribute
 * based on their interval and tiles/flags per tick.
 * For offline, we assume a steady-state board with average safe tiles.
 */
function estimateIncomePerSecond(): number {
  let ips = 0;

  // Auto-clear bots contribution
  if (state.upgrades.auto_clear > 0) {
    const interval     = UPGRADE_MAP['auto_clear_speed'].effect(state.upgrades.auto_clear_speed);
    const tilesPerTick = UPGRADE_MAP['auto_clear'].effect(state.upgrades.auto_clear);
    const botCount     = state.upgrades.auto_clear_speed > 0 ? getBotCount('auto_clear_speed') : 1;
    const ticksPerSec  = 1000 / interval;
    const rate         = UPGRADE_MAP['money_per_tile'].effect(state.upgrades.money_per_tile);
    ips += botCount * ticksPerSec * tilesPerTick * rate * state.prestigeMultiplier;
  }

  // Auto-flag bots contribution (flagging earns money_per_tile too)
  if (state.upgrades.auto_flag > 0) {
    const interval     = UPGRADE_MAP['auto_flag_speed'].effect(state.upgrades.auto_flag_speed);
    const flagsPerTick = UPGRADE_MAP['auto_flag'].effect(state.upgrades.auto_flag);
    const botCount     = state.upgrades.auto_flag_speed > 0 ? getBotCount('auto_flag_speed') : 1;
    const ticksPerSec  = 1000 / interval;
    const rate         = UPGRADE_MAP['money_per_tile'].effect(state.upgrades.money_per_tile);
    ips += botCount * ticksPerSec * flagsPerTick * rate * state.prestigeMultiplier;
  }

  return ips;
}

/**
 * Called on game load. Checks how long the player was away and
 * applies offline earnings if any bots are active.
 */
export function applyOfflineEarnings(addMoneyFn: (amount: number) => void): void {
  const now = Date.now();
  const lastSave = state.lastSaveTime ?? now;
  const elapsedMs = now - lastSave;
  const elapsedSec = elapsedMs / 1000;

  // Don't process tiny gaps (< 60 seconds) or negative (clock skew)
  if (elapsedSec < 60) return;

  const ips = estimateIncomePerSecond();
  if (ips <= 0) return; // no bots = no offline income

  const cappedSec = Math.min(elapsedSec, CONFIG.maxOfflineHours * 3600);
  const earned    = Math.floor(ips * cappedSec * CONFIG.offlineEfficiency);

  if (earned <= 0) return;

  addMoneyFn(earned);
  checkOfflineEarner();

  const timeStr    = formatDuration(cappedSec);
  const cappedStr  = cappedSec < elapsedSec
    ? ` (capped at ${CONFIG.maxOfflineHours}h)`
    : '';

  showToast(
    `${EMOJI_OFFLINE} Away for ${timeStr}${cappedStr}: +${formatMoney(earned)} offline income!`
  );
}