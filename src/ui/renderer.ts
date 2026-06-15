import type { TileState } from '../state/types';
import { state, tiles, setTiles, setBoardInitialized } from '../state/state';
import { boardEl } from './dom';

type ClickHandler = (r: number, c: number) => void;
let _onTileClick: ClickHandler = () => {};
let _onTileRightClick: ClickHandler = () => {};

export function setTileHandlers(click: ClickHandler, rightClick: ClickHandler) {
  _onTileClick = click;
  _onTileRightClick = rightClick;
}

// Below this tile size, switch to canvas rendering
const CANVAS_THRESHOLD_PX = 6;

let usingCanvas = false;
let canvasEl: HTMLCanvasElement | null = null;

export function renderBoard() {
  const { rows, cols } = state;

  if (tiles.length === 0) {
    setTiles(Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0,
      }))
    ));
    setBoardInitialized(false);
  }

  const tileSize = getTileSize();
  usingCanvas = tileSize < CANVAS_THRESHOLD_PX;

  boardEl.innerHTML = '';
  canvasEl = null;

  if (usingCanvas) {
    renderCanvas(rows, cols, tileSize);
  } else {
    renderDom(rows, cols, tileSize);
  }
}

// ---- Canvas rendering ----

function renderCanvas(rows: number, cols: number, tileSize: number) {
  const canvas = document.createElement('canvas');
  const pixelSize = Math.max(1, tileSize);
  canvas.width  = cols * pixelSize;
  canvas.height = rows * pixelSize;
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'pixelated';
  canvasEl = canvas;

  canvas.addEventListener('click', (e) => {
    const [r, c] = canvasCoords(e, canvas, pixelSize);
    if (r >= 0) _onTileClick(r, c);
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const [r, c] = canvasCoords(e, canvas, pixelSize);
    if (r >= 0) _onTileRightClick(r, c);
  });

  boardEl.style.width  = `${canvas.width}px`;
  boardEl.style.height = `${canvas.height}px`;
  boardEl.appendChild(canvas);
  drawCanvas();
}

function canvasCoords(e: MouseEvent, canvas: HTMLCanvasElement, pixelSize: number): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top)  * scaleY;
  const c = Math.floor(x / pixelSize);
  const r = Math.floor(y / pixelSize);
  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return [-1, -1];
  return [r, c];
}

export function drawCanvas() {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  const { rows, cols } = state;
  const px = canvasEl.width / cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = tiles[r][c];
      const x = c * px;
      const y = r * px;

      // Fill base color
      ctx.fillStyle = tileBaseColor(tile);
      ctx.fillRect(x, y, px, px);

      // Only draw border detail if tiles are big enough to see it
      if (px >= 3) {
        if (!tile.isRevealed) {
          // Win95 raised look: light top-left, dark bottom-right
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, px - 1, 1);         // top
          ctx.fillRect(x, y, 1, px - 1);         // left
          ctx.fillStyle = '#808080';
          ctx.fillRect(x + px - 1, y, 1, px);    // right
          ctx.fillRect(x, y + px - 1, px, 1);    // bottom
        } else {
          // Revealed: subtle 1px dark border
          ctx.fillStyle = '#909090';
          ctx.fillRect(x, y, px, 1);
          ctx.fillRect(x, y, 1, px);
        }
      } else {
        // At 1-2px just draw a 1px separator so grid is visible
        ctx.fillStyle = '#404040';
        ctx.fillRect(x + px - 1, y, 1, px);
        ctx.fillRect(x, y + px - 1, px, 1);
      }

      // Flag dot
      if (tile.isFlagged && !tile.isRevealed && px >= 2) {
        ctx.fillStyle = '#ff4400';
        const dot = Math.max(1, Math.floor(px * 0.4));
        const offset = Math.floor((px - dot) / 2);
        ctx.fillRect(x + offset, y + offset, dot, dot);
      }
    }
  }
}

function tileBaseColor(tile: TileState): string {
  if (tile.isRevealed) {
    if (tile.isMine)            return '#cc0000'; // red
    if (tile.adjacentMines > 0) return '#a0a0a0'; // mid grey — has a number
    return '#e8e8e8';                              // light grey — empty/cleared
  }
  if (tile.isFlagged) return '#c04000';
  return '#5a5a5a'; // dark grey — unrevealed, clearly distinct from revealed
}

function tileColor(tile: TileState): string {
  if (tile.isRevealed) {
    if (tile.isMine)           return '#ff0000';
    if (tile.adjacentMines > 0) return '#888888';
    return '#c8c8c8';
  }
  if (tile.isFlagged) return '#ff8800';
  return '#c0c0c0';
}

// ---- DOM rendering (existing logic, unchanged) ----

function renderDom(rows: number, cols: number, tileSize: number) {
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
  boardEl.style.width  = `${cols * tileSize}px`;
  boardEl.style.height = `${rows * tileSize}px`;

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

// ---- Shared helpers ----

export function getTileSize(): number {
  return parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--tile-size')
  ) || 36;
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
  if (usingCanvas) return null; // canvas mode — no individual tile elements
  return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

export function refreshTile(r: number, c: number) {
  if (usingCanvas) {
    // Redraw just this one tile on the canvas
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const px = Math.max(1, canvasEl.width / state.cols);
    ctx.fillStyle = tileColor(tiles[r][c]);
    ctx.fillRect(c * px, r * px, px, px);
    return;
  }
  const el = getTileEl(r, c);
  if (el) updateTileElement(el, tiles[r][c]);
}

function setupLongPress(el: HTMLElement, callback: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  el.addEventListener('touchstart', () => {
    timer = setTimeout(() => { callback(); timer = null; }, 500);
  }, { passive: true });
  el.addEventListener('touchend',  () => { if (timer) { clearTimeout(timer); timer = null; } });
  el.addEventListener('touchmove', () => { if (timer) { clearTimeout(timer); timer = null; } });
}

export function refreshAllTiles() {
  if (usingCanvas) {
    drawCanvas();
    return;
  }
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      refreshTile(r, c);
    }
  }
}