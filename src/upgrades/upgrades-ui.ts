import type { UpgradeId } from '../state/types';
import { state } from '../state/state';
import { UPGRADES, UPGRADE_MAP, upgradeCost, getBotCount } from './upgrades';
import { formatMoney } from '../state/save';
import { upgradesListEl } from '../ui/dom';
import { updateHUD, showToast, updateTimerDisplay } from '../ui/hud';
import { startAutoClearTimer, startAutoFlagTimer } from '../game/timers';
import { getStartingTime, CONFIG } from '../config';
import { setAutoMinerPaused, getAutoMinerPaused, setAutoFlaggerPaused, getAutoFlaggerPaused } from '../ui/toolbar';
import { checkAchievements } from '../game/achievements';

// ---- Category metadata ----
const UPGRADE_CATEGORY: Record<UpgradeId, 'Income' | 'Automation' | 'Board'> = {
  money_per_tile:    'Income',
  board_clear_bonus: 'Income',
  longer_timer:      'Board',
  auto_clear:        'Automation',
  auto_clear_speed:  'Automation',
  auto_flag:         'Automation',
  auto_flag_speed:   'Automation',
};

const HIDDEN_UNTIL: Partial<Record<UpgradeId, { req: UpgradeId; minLevel: number }>> = {
  auto_clear_speed: { req: 'auto_clear', minLevel: 1 },
  auto_flag_speed:  { req: 'auto_flag',  minLevel: 1 },
};

function isHidden(id: UpgradeId): boolean {
  const gate = HIDDEN_UNTIL[id];
  if (!gate) return false;
  return state.upgrades[gate.req] < gate.minLevel;
}

function playUnlockChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch { /* noop */ }
}

function playBotUnlockChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [440, 550, 660, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square'; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
    });
  } catch { /* noop */ }
}

// ---- Render ----
export function renderUpgrades() {
  upgradesListEl.innerHTML = '';
  UPGRADES.forEach(upgrade => {
    const el = document.createElement('div');
    el.className = 'upgrade-item';
    el.dataset.id = upgrade.id;

    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.auto-miner-toggle-btn')) return;
      buyUpgrade(upgrade.id);
    });

    upgradesListEl.appendChild(el);
    updateUpgradeElement(upgrade.id);
  });
}

export function updateUpgradeElement(id: UpgradeId) {
  const upgrade    = UPGRADE_MAP[id];
  const level      = state.upgrades[id];
  const cost       = upgradeCost(upgrade, level);
  const canAfford  = state.money >= cost;
  const hidden     = isHidden(id);
  const category   = UPGRADE_CATEGORY[id];

  const isSpeedUpgrade    = id === 'auto_clear_speed' || id === 'auto_flag_speed';
  const nextLevelIsNewBot = isSpeedUpgrade && level > 0 && (level % CONFIG.BOT_LEVEL_INTERVAL === 0);

  const el = upgradesListEl.querySelector(`[data-id="${id}"]`) as HTMLElement;
  if (!el) return;

  if (hidden) {
    el.classList.add('upgrade-hidden');
    el.innerHTML = '';
    return;
  }
  el.classList.remove('upgrade-hidden');

  el.className = 'upgrade-item';
  if (!canAfford) el.classList.add('cannot-afford');

  const categoryClass = `cat-${category.toLowerCase()}`;
  const botBadge = nextLevelIsNewBot
    ? `<span class="upgrade-bot-badge">🤖 +1 BOT</span>`
    : '';

  const costHtml = `<div class="upgrade-cost ${canAfford ? 'affordable' : ''}">${formatMoney(cost)}${botBadge}</div>`;

  let levelText = '';
  if (level > 0) {
    if (isSpeedUpgrade) {
      const bots = getBotCount(id as 'auto_clear_speed' | 'auto_flag_speed');
      levelText = `<div class="upgrade-level">Lvl ${level} · ${bots} bot${bots > 1 ? 's' : ''}</div>`;
    } else {
      levelText = `<div class="upgrade-level">Lvl ${level}</div>`;
    }
  }

  const isAutoClear   = id === 'auto_clear';
  const isAutoFlag    = id === 'auto_flag';
  const showPauseBtn  = (isAutoClear || isAutoFlag) && level >= 1;
  const paused        = isAutoFlag ? getAutoFlaggerPaused() : getAutoMinerPaused();
  const pauseTitle    = isAutoFlag ? 'Pause/resume auto-flagger' : 'Pause/resume auto-miner';
  const pauseHtml     = showPauseBtn
    ? `<button class="auto-miner-toggle-btn tool-btn ${paused ? 'paused' : ''}" title="${pauseTitle}">
         ${paused ? '⏸ OFF' : '▶ ON'}
       </button>`
    : '';

  el.innerHTML = `
    <span class="upgrade-icon">${upgrade.icon}</span>
    <div class="upgrade-info">
      <div class="upgrade-name-row">
        <span class="upgrade-name">${upgrade.name}</span>
        <span class="upgrade-category ${categoryClass}">${category}</span>
      </div>
      <div class="upgrade-desc">${upgrade.desc(level)}</div>
      ${levelText}
    </div>
    <div class="upgrade-right">
      ${pauseHtml}
      ${costHtml}
    </div>
  `;

  if (showPauseBtn) {
    const btn = el.querySelector('.auto-miner-toggle-btn') as HTMLButtonElement;
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isAutoFlag) {
        setAutoFlaggerPaused(!getAutoFlaggerPaused());
        updateUpgradeElement('auto_flag');
      } else {
        setAutoMinerPaused(!getAutoMinerPaused());
        updateUpgradeElement('auto_clear');
      }
    });
  }
}

export function updateUpgradesAffordability() {
  UPGRADES.forEach(u => updateUpgradeElement(u.id));
}

function triggerMilestoneAnimation(el: HTMLElement) {
  el.classList.remove('milestone-unlock');
  void el.offsetWidth;
  el.classList.add('milestone-unlock');
  setTimeout(() => el.classList.remove('milestone-unlock'), 800);
}

function buyUpgrade(id: UpgradeId) {
  const upgrade  = UPGRADE_MAP[id];
  const level    = state.upgrades[id];
  if (isHidden(id)) return;

  const cost = upgradeCost(upgrade, level);
  if (state.money < cost) return;

  const wasLevelZero      = level === 0;
  const isSpeedUpgrade    = id === 'auto_clear_speed' || id === 'auto_flag_speed';
  const crossesBotBoundary = isSpeedUpgrade && level > 0 && (level % CONFIG.BOT_LEVEL_INTERVAL === 0);

  state.money -= cost;
  state.upgrades[id]++;

  updateUpgradesAffordability();
  updateHUD();
  checkAchievements();

  const el = upgradesListEl.querySelector(`[data-id="${id}"]`) as HTMLElement;

  if (wasLevelZero) {
    playUnlockChime();
    if (el) triggerMilestoneAnimation(el);
    showToast(`🔓 ${upgrade.name} unlocked!`);
  } else if (crossesBotBoundary) {
    playBotUnlockChime();
    if (el) triggerMilestoneAnimation(el);
    const newBots = getBotCount(id as 'auto_clear_speed' | 'auto_flag_speed');
    showToast(`🤖 New bot! ${upgrade.name} now has ${newBots} bots!`);
  } else {
    showToast(`${upgrade.icon} ${upgrade.name} upgraded!`);
  }

  updateUpgradeElement(id);

  if (id === 'auto_clear' || id === 'auto_clear_speed') startAutoClearTimer();
  if (id === 'auto_flag'  || id === 'auto_flag_speed')  startAutoFlagTimer();

  if (id === 'longer_timer') {
    state.timeLeft = getStartingTime(state.prestigeCount) + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
    updateTimerDisplay();
  }
}

export function setAutoMinerPausedGetterForUpgrades(_fn: () => boolean) { /* no-op */ }