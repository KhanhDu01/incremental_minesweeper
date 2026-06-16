// ============================================================
//  DOM REFS
// ============================================================

export let boardEl: HTMLElement;
export let mineCounterEl: HTMLElement;
export let timerEl: HTMLElement;
export let smileyBtn: HTMLElement;
export let moneyDisplay: HTMLElement;
export let mpsDisplay: HTMLElement;
export let boardsDisplay: HTMLElement;
export let progressBar: HTMLElement;
export let progressLabel: HTMLElement;
export let upgradesListEl: HTMLElement;
export let prestigeBar: HTMLElement;
export let prestigeBtn: HTMLElement;
export let prestigeInfo: HTMLElement;
export let toastContainer: HTMLElement;
export let flagModeBtn: HTMLElement;
export let zoomInBtn: HTMLElement;
export let zoomOutBtn: HTMLElement;
export let zoomLabel: HTMLElement;
//export let resetBtn: HTMLElement;
//export let adToggleBtn: HTMLElement;
export let adSpaceContainer: HTMLElement;
export let adIncomeLabel: HTMLElement;
export let adCloseBtn: HTMLElement;

export function cacheDomRefs() {
  boardEl            = document.getElementById('board')!;
  mineCounterEl      = document.getElementById('mine-counter')!;
  timerEl            = document.getElementById('timer-display')!;
  smileyBtn          = document.getElementById('smiley-btn')!;
  moneyDisplay       = document.getElementById('money-display')!;
  mpsDisplay         = document.getElementById('mps-display')!;
  boardsDisplay      = document.getElementById('boards-display')!;
  progressBar        = document.getElementById('progress-bar')!;
  progressLabel      = document.getElementById('progress-label')!;
  upgradesListEl     = document.getElementById('upgrades-list')!;
  prestigeBar        = document.getElementById('prestige-bar')         ?? document.createElement('div');
  prestigeBtn        = document.getElementById('prestige-btn')        ?? document.createElement('button');
  prestigeInfo       = document.getElementById('prestige-info')       ?? document.createElement('span');
  toastContainer     = document.getElementById('toast-container')!;
  flagModeBtn        = document.getElementById('flag-mode-btn')!;
  zoomInBtn          = document.getElementById('zoom-in-btn')!;
  zoomOutBtn         = document.getElementById('zoom-out-btn')!;
  zoomLabel          = document.getElementById('zoom-label')!;
  //resetBtn           = document.getElementById('reset-btn')!;
  //adToggleBtn        = document.getElementById('ad-toggle-btn')!;
  adSpaceContainer   = document.getElementById('ad-space-container')    ?? document.createElement('div');
  adIncomeLabel      = document.getElementById('ad-income-label')       ?? document.createElement('span');
  adCloseBtn         = document.getElementById('ad-close-btn')         ?? document.createElement('button');
}