import type { TileState } from '../types';
import { state, tiles, setTiles, setBoardInitialized } from '../state';
import { boardEl } from '../dom';

// ============================================================
//  BOARD RENDERER
// ============================================================

// Set externally after init to avoid circular deps
type ClickHandler = (r: number, c: number) => void;
let _onTileClick: ClickHandler = () => {};
let _onTileRightClick: ClickHandler = () => {};

export function setTileHandlers(click: ClickHandler, rightClick: ClickHandler) {
  _onTileClick = click;
  _onTileRightClick = rightClick;
}

export function renderBoard() {
  const { rows, cols } = state;

  // Show blank board before first click (real mines placed on first click)
  if (tiles.length === 0) {
    setTiles(Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0,
      }))
    ));
    setBoardInitialized(false);
  }

  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
  boardEl.innerHTML = '';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const el = document.createElement('div');
      el.className = 'tile';
      el.dataset.r = String(r);
      el.dataset.c = String(c);

      el.addEventListener('click', () => _onTileClick(r, c));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); _onTileRightClick(r, c); });
      setupLongPress(el, () => _onTileRightClick(r, c));

      updateTileElement(el, tiles[r][c]);
      boardEl.appendChild(el);
    }
  }
}

export function updateTileElement(el: HTMLElement, tile: TileState) {
  el.className = 'tile';
  el.textContent = '';
  el.removeAttribute('data-num');

  if (tile.isRevealed) {
    el.classList.add('revealed');
    if (tile.adjacentMines > 0) {
      el.textContent = String(tile.adjacentMines);
      el.dataset.num = String(tile.adjacentMines);
    }
  } else if (tile.isFlagged) {
    el.textContent = '🚩';
  }
}

export function getTileEl(r: number, c: number): HTMLElement | null {
  return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

export function refreshTile(r: number, c: number) {
  const el = getTileEl(r, c);
  if (el) updateTileElement(el, tiles[r][c]);
}

// ============================================================
//  LONG PRESS (mobile flag)
// ============================================================

function setupLongPress(el: HTMLElement, callback: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  el.addEventListener('touchstart', () => {
    timer = setTimeout(() => { callback(); timer = null; }, 500);
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (timer) { clearTimeout(timer); timer = null; }
  });

  el.addEventListener('touchmove', () => {
    if (timer) { clearTimeout(timer); timer = null; }
  });
}
