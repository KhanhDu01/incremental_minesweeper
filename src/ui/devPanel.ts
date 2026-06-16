// ============================================================
//  DEV PANEL
//  Hidden dev tools: set money, prestige, boards, upgrade levels.
// ============================================================

import { state } from '../state/state';
import { UPGRADES } from '../upgrades/upgrades';
import { updateHUD, updatePrestigeBar } from './hud';
import { updateUpgradesAffordability, renderUpgrades } from '../upgrades/upgrades-ui';
import { getBoardDims, getStartingTime, getPrestigeMultiplier } from '../config';
import { startAutoClearTimer, startAutoFlagTimer } from '../game/timers';

let panelEl: HTMLElement | null = null;
let visible = false;

export function initDevPanel() {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;

  const btn = document.createElement('button');
  btn.className = 'tool-btn';
  btn.textContent = '🛠️';
  btn.title = 'Developer panel';
  btn.addEventListener('click', () => toggleDevPanel());
  toolbar.appendChild(btn);

  panelEl = document.createElement('div');
  panelEl.id = 'dev-panel';
  Object.assign(panelEl.style, {
    display: 'none',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    zIndex: '9999',
    background: '#c0c0c0',
    borderTop: '3px solid #fff',
    borderLeft: '3px solid #fff',
    borderBottom: '3px solid #404040',
    borderRight: '3px solid #404040',
    padding: '12px',
    minWidth: '300px',
    maxHeight: '80vh',
    overflowY: 'auto',
    fontFamily: "'Courier New', monospace",
    fontSize: '12px',
    boxSizing: 'border-box',
  } as any);

  panelEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <b style="font-size:13px;letter-spacing:1px;">🛠️ DEV PANEL</b>
      <button id="dev-close" style="font-family:monospace;cursor:pointer;padding:2px 8px;">✕ Close</button>
    </div>

    <div style="margin-bottom:8px;display:flex;gap:8px;align-items:center;">
      <label style="white-space:nowrap;">💰 Money:</label>
      <input id="dev-money" type="number" value="0" style="width:110px;font-family:monospace;">
      <button id="dev-set-money" style="font-family:monospace;cursor:pointer;padding:2px 8px;">Set</button>
    </div>

    <div style="margin-bottom:8px;display:flex;gap:8px;align-items:center;">
      <label style="white-space:nowrap;">⭐ Prestige:</label>
      <input id="dev-prestige" type="number" value="0" min="0" style="width:70px;font-family:monospace;">
      <button id="dev-set-prestige" style="font-family:monospace;cursor:pointer;padding:2px 8px;">Set</button>
    </div>

    <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;">
      <label style="white-space:nowrap;">🏆 Boards:</label>
      <input id="dev-boards" type="number" value="0" min="0" style="width:70px;font-family:monospace;">
      <button id="dev-set-boards" style="font-family:monospace;cursor:pointer;padding:2px 8px;">Set</button>
    </div>

    <div style="margin-bottom:6px;"><b>Upgrade levels:</b></div>
    <div id="dev-upgrades" style="display:grid;grid-template-columns:1fr 80px 56px;gap:4px 6px;margin-bottom:10px;align-items:center;"></div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button id="dev-max-all" style="font-family:monospace;cursor:pointer;padding:3px 8px;">Max all (lvl 10)</button>
      <button id="dev-reset-upgrades" style="font-family:monospace;cursor:pointer;padding:3px 8px;">Reset upgrades</button>
    </div>
  `;

  document.body.appendChild(panelEl);
  wireButtons();
}

function buildUpgradeInputs() {
  const container = panelEl?.querySelector('#dev-upgrades') as HTMLElement;
  if (!container) return;
  container.innerHTML = '';
  for (const u of UPGRADES) {
    const label = document.createElement('span');
    label.textContent = `${u.icon} ${u.name}`;
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.whiteSpace = 'nowrap';
    label.title = u.name;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.value = String(state.upgrades[u.id]);
    input.dataset.upgradeId = u.id;
    input.style.cssText = 'width:75px;font-family:monospace;font-size:11px;';

    const setBtn = document.createElement('button');
    setBtn.textContent = 'Set';
    setBtn.style.cssText = 'font-family:monospace;cursor:pointer;padding:1px 6px;font-size:11px;';
    setBtn.addEventListener('click', () => {
      const val = Math.max(0, parseInt(input.value) || 0);
      state.upgrades[u.id] = val;
      if (u.id === 'auto_clear' || u.id === 'auto_clear_speed') startAutoClearTimer();
      if (u.id === 'auto_flag'  || u.id === 'auto_flag_speed')  startAutoFlagTimer();
      updateUpgradesAffordability();
      updateHUD();
      renderUpgrades();
    });

    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(setBtn);
  }
}

function refreshInputValues() {
  if (!panelEl) return;
  (panelEl.querySelector('#dev-money')    as HTMLInputElement).value = String(Math.floor(state.money));
  (panelEl.querySelector('#dev-prestige') as HTMLInputElement).value = String(state.prestigeCount);
  (panelEl.querySelector('#dev-boards')   as HTMLInputElement).value = String(state.boardsCleared);
  buildUpgradeInputs();
}

function wireButtons() {
  if (!panelEl) return;

  panelEl.querySelector('#dev-close')?.addEventListener('click', () => toggleDevPanel(false));

  panelEl.querySelector('#dev-set-money')?.addEventListener('click', () => {
    const val = parseFloat((panelEl!.querySelector('#dev-money') as HTMLInputElement).value) || 0;
    state.money = Math.max(0, val);
    updateHUD();
    updateUpgradesAffordability();
  });

  panelEl.querySelector('#dev-set-prestige')?.addEventListener('click', () => {
    const val = Math.max(0, parseInt((panelEl!.querySelector('#dev-prestige') as HTMLInputElement).value) || 0);
    state.prestigeCount      = val;
    state.prestigeMultiplier = getPrestigeMultiplier(val);
    const dims = getBoardDims(val);
    state.cols     = dims.cols;
    state.rows     = dims.rows;
    state.mineCount = dims.mineCount;
    state.timeLeft  = getStartingTime(val);
    updateHUD();
    updatePrestigeBar();
    renderUpgrades(); // desc strings depend on prestige (timer upgrade)
  });

  panelEl.querySelector('#dev-set-boards')?.addEventListener('click', () => {
    const val = Math.max(0, parseInt((panelEl!.querySelector('#dev-boards') as HTMLInputElement).value) || 0);
    state.boardsCleared = val;
    updateHUD();
    updatePrestigeBar();
  });

  panelEl.querySelector('#dev-max-all')?.addEventListener('click', () => {
    for (const u of UPGRADES) state.upgrades[u.id] = 10;
    startAutoClearTimer();
    startAutoFlagTimer();
    updateUpgradesAffordability();
    updateHUD();
    renderUpgrades();
    buildUpgradeInputs();
  });

  panelEl.querySelector('#dev-reset-upgrades')?.addEventListener('click', () => {
    for (const u of UPGRADES) state.upgrades[u.id] = 0;
    startAutoClearTimer();
    startAutoFlagTimer();
    updateUpgradesAffordability();
    updateHUD();
    renderUpgrades();
    buildUpgradeInputs();
  });
}

export function toggleDevPanel(show?: boolean) {
  if (!panelEl) return;
  visible = show !== undefined ? show : !visible;
  panelEl.style.display = visible ? 'block' : 'none';
  if (visible) refreshInputValues();
}