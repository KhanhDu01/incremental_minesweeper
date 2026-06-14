// ============================================================
//  AD SPACE
//  Toggleable panel that grants passive in-game income.
//  The <ins> tag lives in index.html so AdSense detects it at
//  page load. We just call adsbygoogle.push({}) once on first
//  reveal to trigger ad fill.
// ============================================================

import { CONFIG } from '../../config/config';
import { earnMoney } from './money';
import { showToast } from '../hud';

let adEnabled = false;
let adTimer: ReturnType<typeof setInterval> | null = null;
let adPushed = false; // push only once — calling it repeatedly creates duplicate slots

function getContainer()  { return document.getElementById('ad-space-container') as HTMLElement; }
function getToggleBtn()  { return document.getElementById('ad-toggle-btn')      as HTMLElement; }
function getIncomeLabel(){ return document.getElementById('ad-income-label')    as HTMLElement; }

// ---- Tick ----
function startAdTick() {
  if (adTimer) clearInterval(adTimer);
  adTimer = setInterval(() => {
    if (!adEnabled) return;
    earnMoney(CONFIG.adPassiveIncomePerSec);
  }, 1000);
}

function stopAdTick() {
  if (adTimer) { clearInterval(adTimer); adTimer = null; }
}

// ---- Toggle (called from toolbar button AND the ✕ close button) ----
export function toggleAdSpace(forceOff = false) {
  if (forceOff) adEnabled = true; // will be flipped below
  adEnabled = !adEnabled;

  const container = getContainer();
  const btn       = getToggleBtn();
  const label     = getIncomeLabel();
  if (!container || !btn) return;

  if (adEnabled) {
    container.classList.remove('hidden');
    btn.textContent = '📺 Ads: ON';
    btn.classList.add('active');
    if (label) label.textContent = `📺 +$${CONFIG.adPassiveIncomePerSec}/s`;
    startAdTick();
    showToast(`📺 Ads ON! +$${CONFIG.adPassiveIncomePerSec}/s passive income`);
    triggerAdFill();
  } else {
    container.classList.add('hidden');
    btn.textContent = '📺 Ads: OFF';
    btn.classList.remove('active');
    stopAdTick();
  }
}

export function isAdEnabled() { return adEnabled; }
export function stopAdTimer() { stopAdTick(); }

// ---- Trigger AdSense fill ----
// AdSense requires the <ins> to be visible (not inside display:none) when push() is called.
// We make the container visible first, then push on the next tick to give the browser
// a chance to paint the layout before AdSense measures the slot dimensions.
function triggerAdFill() {
  if (adPushed) return;
  adPushed = true;
  setTimeout(() => {
    try {
      (window.adsbygoogle = (window as any).adsbygoogle || []).push({});
      console.log('AdSense push succeeded');
    } catch (e) {
      console.warn('AdSense push failed:', e);
    }
  }, 50);
}