import type { UpgradeId } from '../types';
import { state } from '../state';
import { UPGRADES, UPGRADE_MAP, upgradeCost } from '../components/upgrades';
import { formatMoney } from '../save';
import { upgradesListEl } from '../dom';
import { updateHUD, showToast, updateAutoMinerToggle } from '../hud';
import { startAutoClearTimer, startAutoFlagTimer } from '../helper/timers';

// ============================================================
//  UPGRADES UI
// ============================================================

// Injected: paused getter for auto-miner toggle
let _getAutoMinerPaused: () => boolean = () => false;
export function setAutoMinerPausedGetterForUpgrades(fn: () => boolean) {
  _getAutoMinerPaused = fn;
}

export function renderUpgrades() {
  upgradesListEl.innerHTML = '';
  UPGRADES.forEach(upgrade => {
    const el = document.createElement('div');
    el.className = 'upgrade-item';
    el.dataset.id = upgrade.id;
    el.addEventListener('click', () => buyUpgrade(upgrade.id));
    upgradesListEl.appendChild(el);
    updateUpgradeElement(upgrade.id);
  });
}

export function updateUpgradeElement(id: UpgradeId) {
  const upgrade = UPGRADE_MAP[id];
  const level = state.upgrades[id];
  const maxed = level >= upgrade.maxLevel;
  const cost = upgradeCost(upgrade, level);
  const canAfford = state.money >= cost;

  const el = upgradesListEl.querySelector(`[data-id="${id}"]`) as HTMLElement;
  if (!el) return;

  el.className = 'upgrade-item';
  if (maxed) el.classList.add('maxed');
  else if (!canAfford) el.classList.add('cannot-afford');

  el.innerHTML = `
    <span class="upgrade-icon">${upgrade.icon}</span>
    <div class="upgrade-info">
      <div class="upgrade-name">${upgrade.name}</div>
      <div class="upgrade-desc">${upgrade.desc(level)}</div>
      ${level > 0 ? `<div class="upgrade-level">Lvl ${level}/${upgrade.maxLevel}</div>` : ''}
    </div>
    <div class="upgrade-cost ${canAfford && !maxed ? 'affordable' : ''}">
      ${maxed ? 'MAX' : formatMoney(cost)}
    </div>
  `;
}

export function updateUpgradesAffordability() {
  UPGRADES.forEach(u => updateUpgradeElement(u.id));
}

function buyUpgrade(id: UpgradeId) {
  const upgrade = UPGRADE_MAP[id];
  const level = state.upgrades[id];
  if (level >= upgrade.maxLevel) return;

  const cost = upgradeCost(upgrade, level);
  if (state.money < cost) return;

  // Deduct cost directly (don't call earnMoney — that adds, not subtracts)
  state.money -= cost;
  state.upgrades[id]++;

  updateUpgradeElement(id);
  updateHUD();
  updateUpgradesAffordability();
  showToast(`${upgrade.icon} ${upgrade.name} upgraded!`);

  if (id === 'auto_clear' || id === 'auto_clear_speed') startAutoClearTimer();
  if (id === 'auto_flag' || id === 'auto_flag_speed') startAutoFlagTimer();

  updateAutoMinerToggle(_getAutoMinerPaused());
}
