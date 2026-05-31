import type { UpgradeId } from '../types';
import { state } from '../state';
import { UPGRADES, UPGRADE_MAP, upgradeCost } from '../components/upgrades';
import { formatMoney } from '../save';
import { upgradesListEl } from '../dom';
import { updateHUD, showToast, updateAutoMinerToggle, updateTimerDisplay } from '../hud';
import { startAutoClearTimer, startAutoFlagTimer } from '../helper/timers';
import { CONFIG } from '../../config/config';

let _getAutoMinerPaused: () => boolean = () => false;
export function setAutoMinerPausedGetterForUpgrades(fn: () => boolean) {
  _getAutoMinerPaused = fn;
}

// ---- Category metadata ----
const UPGRADE_CATEGORY: Record<UpgradeId, 'Income' | 'Automation' | 'Board'> = {
  money_per_tile:  'Income',
  board_clear_bonus: 'Income',
  reveal_area:     'Income',
  longer_timer:    'Board',
  auto_clear:      'Automation',
  auto_clear_speed:'Automation',
  auto_flag:       'Automation',
  auto_flag_speed: 'Automation',
};

// Upgrades hidden until their prerequisite is owned
const HIDDEN_UNTIL: Partial<Record<UpgradeId, { req: UpgradeId; minLevel: number }>> = {
  auto_clear_speed: { req: 'auto_clear',  minLevel: 1 },
  auto_flag_speed:  { req: 'auto_flag',   minLevel: 1 },
};

function isHidden(id: UpgradeId): boolean {
  const gate = HIDDEN_UNTIL[id];
  if (!gate) return false;
  return state.upgrades[gate.req] < gate.minLevel;
}

// ---- Payback calculation ----
// Returns seconds to recoup cost from the marginal income gain, or null if not applicable.
function calcPayback(id: UpgradeId): number | null {
  const upgrade = UPGRADE_MAP[id];
  const level = state.upgrades[id];
  if (level >= upgrade.maxLevel) return null;

  const cost = upgradeCost(upgrade, level);
  const mps = getMpsFromUpgrade(id, level);
  const mpsAfter = getMpsFromUpgrade(id, level + 1);
  const delta = mpsAfter - mps;
  if (delta <= 0) return null;
  return Math.round(cost / delta);
}

// Rough $/s contribution of an upgrade at a given level, assuming average auto-clear rate
function getMpsFromUpgrade(id: UpgradeId, level: number): number {
  // We estimate based on current auto-clear rate × tile value
  const tilesPerSec = getEstimatedTilesPerSec();
  switch (id) {
    case 'money_per_tile':
      return tilesPerSec * UPGRADE_MAP['money_per_tile'].effect(level) * state.prestigeMultiplier;
    case 'auto_clear': {
      const speed = Math.max(100, UPGRADE_MAP['auto_clear_speed'].effect(state.upgrades.auto_clear_speed));
      const perSec = (UPGRADE_MAP['auto_clear'].effect(level) * 1000) / speed;
      return perSec * UPGRADE_MAP['money_per_tile'].effect(state.upgrades.money_per_tile) * state.prestigeMultiplier;
    }
    case 'auto_clear_speed': {
      const tiles = UPGRADE_MAP['auto_clear'].effect(state.upgrades.auto_clear);
      const speed = Math.max(100, UPGRADE_MAP['auto_clear_speed'].effect(level));
      return (tiles * 1000 / speed) * UPGRADE_MAP['money_per_tile'].effect(state.upgrades.money_per_tile) * state.prestigeMultiplier;
    }
    default:
      return 0;
  }
}

function getEstimatedTilesPerSec(): number {
  const tiles = UPGRADE_MAP['auto_clear'].effect(state.upgrades.auto_clear);
  if (tiles === 0) return 0;
  const speed = Math.max(100, UPGRADE_MAP['auto_clear_speed'].effect(state.upgrades.auto_clear_speed));
  return (tiles * 1000) / speed;
}

// ---- Income before/after hover text ----
function getBeforeAfterText(id: UpgradeId): string | null {
  const level = state.upgrades[id];
  const upgrade = UPGRADE_MAP[id];
  if (level >= upgrade.maxLevel) return null;
  const before = getMpsFromUpgrade(id, level);
  const after  = getMpsFromUpgrade(id, level + 1);
  if (before === 0 && after === 0) return null;
  if (Math.round(before) === Math.round(after)) return null;
  return `${formatMoney(Math.round(before))}/s → ${formatMoney(Math.round(after))}/s`;
}

// ---- Milestone sound (Web Audio) ----
function playMilestoneChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch { /* AudioContext not available */ }
}

function playUnlockChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* noop */ }
}

// ---- Render ----
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
  const hidden = isHidden(id);
  const category = UPGRADE_CATEGORY[id];

  const el = upgradesListEl.querySelector(`[data-id="${id}"]`) as HTMLElement;
  if (!el) return;

  if (hidden) {
    el.classList.add('upgrade-hidden');
    el.innerHTML = '';
    return;
  }
  el.classList.remove('upgrade-hidden');

  el.className = 'upgrade-item';
  if (maxed) el.classList.add('maxed');
  else if (!canAfford) el.classList.add('cannot-afford');

  const payback = calcPayback(id);
  const beforeAfter = getBeforeAfterText(id);
  const isGoodDeal = payback !== null && payback <= 20;

  const paybackHtml = payback !== null
    ? `<span class="upgrade-payback ${isGoodDeal ? 'good-deal' : ''}">Pays back ~${payback}s</span>`
    : '';

  const categoryClass = `cat-${category.toLowerCase()}`;

  el.innerHTML = `
    <span class="upgrade-icon">${upgrade.icon}</span>
    <div class="upgrade-info">
      <div class="upgrade-name-row">
        <span class="upgrade-name">${upgrade.name}</span>
        <span class="upgrade-category ${categoryClass}">${category}</span>
      </div>
      <div class="upgrade-desc">${upgrade.desc(level)}</div>
      ${beforeAfter ? `<div class="upgrade-before-after">${beforeAfter}</div>` : ''}
      ${level > 0 ? `<div class="upgrade-level">Lvl ${level}/${upgrade.maxLevel}</div>` : ''}
    </div>
    <div class="upgrade-right">
      ${paybackHtml}
      <div class="upgrade-cost ${canAfford && !maxed ? 'affordable' : ''}">
        ${maxed ? 'MAX' : formatMoney(cost)}
      </div>
    </div>
  `;
}

export function updateUpgradesAffordability() {
  UPGRADES.forEach(u => updateUpgradeElement(u.id));
}

function triggerMilestoneAnimation(el: HTMLElement) {
  el.classList.remove('milestone-unlock');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('milestone-unlock');
  setTimeout(() => el.classList.remove('milestone-unlock'), 800);
}

function buyUpgrade(id: UpgradeId) {
  const upgrade = UPGRADE_MAP[id];
  const level = state.upgrades[id];
  if (level >= upgrade.maxLevel) return;
  if (isHidden(id)) return;

  const cost = upgradeCost(upgrade, level);
  if (state.money < cost) return;

  const wasLevelZero = level === 0;
  const willBeMax = level + 1 >= upgrade.maxLevel;

  state.money -= cost;
  state.upgrades[id]++;

  // Reveal gated upgrades immediately
  updateUpgradesAffordability();
  updateHUD();

  const el = upgradesListEl.querySelector(`[data-id="${id}"]`) as HTMLElement;

  if (wasLevelZero) {
    // First-time unlock: chime + glow
    playUnlockChime();
    if (el) triggerMilestoneAnimation(el);
    showToast(`🔓 ${upgrade.name} unlocked!`);
  } else if (willBeMax) {
    // Maxed out: big chime
    playMilestoneChime();
    if (el) triggerMilestoneAnimation(el);
    showToast(`⭐ ${upgrade.name} MAXED!`);
  } else {
    showToast(`${upgrade.icon} ${upgrade.name} upgraded!`);
  }

  updateUpgradeElement(id);

  if (id === 'auto_clear' || id === 'auto_clear_speed') startAutoClearTimer();
  if (id === 'auto_flag' || id === 'auto_flag_speed') startAutoFlagTimer();

  if (id === 'longer_timer') {
    state.timeLeft = CONFIG.timeLeft + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
    updateTimerDisplay();
  }

  updateAutoMinerToggle(_getAutoMinerPaused());
}