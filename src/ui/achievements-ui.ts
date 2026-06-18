// ============================================================
//  ACHIEVEMENTS UI
//  Renders the achievements tab panel.
// ============================================================

import { state } from '../state/state';
import { ACHIEVEMENTS } from '../game/achievements';
import { achievementsListEl } from './dom';
import { EMOJI_LOCKED } from '../assets/index';

export function renderAchievements() {
  if (!achievementsListEl) return;
  achievementsListEl.innerHTML = '';

  const unlocked = ACHIEVEMENTS.filter(a => state.achievements[a.id]);
  const locked   = ACHIEVEMENTS.filter(a => !state.achievements[a.id]);

  const countEl = document.createElement('div');
  countEl.className = 'achievements-count';
  countEl.textContent = `${unlocked.length} / ${ACHIEVEMENTS.length} unlocked`;
  achievementsListEl.appendChild(countEl);

  // Unlocked first
  for (const ach of unlocked) {
    const el = document.createElement('div');
    el.className = 'achievement-item unlocked';
    el.innerHTML = `
      <span class="achievement-icon">${ach.icon}</span>
      <div class="achievement-info">
        <div class="achievement-name">${ach.name}</div>
        <div class="achievement-desc">${ach.desc}</div>
      </div>
      <span class="achievement-badge">✓</span>
    `;
    achievementsListEl.appendChild(el);
  }

  // Locked (show name & desc but greyed out)
  for (const ach of locked) {
    const el = document.createElement('div');
    el.className = 'achievement-item locked';
    el.innerHTML = `
      <span class="achievement-icon">${EMOJI_LOCKED}</span>
      <div class="achievement-info">
        <div class="achievement-name">${ach.name}</div>
        <div class="achievement-desc">${ach.desc}</div>
      </div>
    `;
    achievementsListEl.appendChild(el);
  }
}