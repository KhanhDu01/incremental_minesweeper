import type { TileState } from '../state/types';
import { state, tiles, setTiles, setBoardInitialized } from '../state/state';
import { boardEl } from './dom';
import { EMOJI_FLAG_TILE } from '../assets/index';

type ClickHandler = (r: number, c: number) => void;
let _onTileClick: ClickHandler = () => {};
let _onTileRightClick: ClickHandler = () => {};

export function setTileHandlers(click: ClickHandler, rightClick: ClickHandler) {
  _onTileClick = click;
  _onTileRightClick = rightClick;
}

const CANVAS_THRESHOLD_PX = 6;
const CANVAS_THRESHOLD_TILES = 5_000;

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
  usingCanvas = (state.rows * state.cols) > CANVAS_THRESHOLD_TILES || tileSize < CANVAS_THRESHOLD_PX;

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

      ctx.fillStyle = tileBaseColor(tile);
      ctx.fillRect(x, y, px, px);

      if (px >= 3) {
        if (!tile.isRevealed) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, px - 1, 1);
          ctx.fillRect(x, y, 1, px - 1);
          ctx.fillStyle = '#808080';
          ctx.fillRect(x + px - 1, y, 1, px);
          ctx.fillRect(x, y + px - 1, px, 1);
        } else {
          ctx.fillStyle = '#909090';
          ctx.fillRect(x, y, px, 1);
          ctx.fillRect(x, y, 1, px);
        }
      } else {
        ctx.fillStyle = '#404040';
        ctx.fillRect(x + px - 1, y, 1, px);
        ctx.fillRect(x, y + px - 1, px, 1);
      }

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
    if (tile.isMine)            return '#cc0000';
    if (tile.adjacentMines > 0) return '#a0a0a0';
    return '#e8e8e8';
  }
  if (tile.isFlagged) return '#c04000';
  return '#5a5a5a';
}

function tileColor(tile: TileState): string {
  if (tile.isRevealed) {
    if (tile.isMine)            return '#ff0000';
    if (tile.adjacentMines > 0) return '#888888';
    return '#c8c8c8';
  }
  if (tile.isFlagged) return '#ff8800';
  return '#c0c0c0';
}

// ---- DOM rendering ----

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
    el.textContent = EMOJI_FLAG_TILE;
  }
}

export function getTileEl(r: number, c: number): HTMLElement | null {
  if (usingCanvas) return null;
  return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

export function refreshTile(r: number, c: number) {
  if (usingCanvas) {
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
  let moved = false;

  el.addEventListener('touchstart', () => {
    moved = false;
    timer = setTimeout(() => {
      if (!moved) callback();
      timer = null;
    }, 150);
  }, { passive: true });

  el.addEventListener('touchmove', () => {
    moved = true;
    if (timer) { clearTimeout(timer); timer = null; }
  }, { passive: true });

  el.addEventListener('touchend',   () => { if (timer) { clearTimeout(timer); timer = null; } });
  el.addEventListener('touchcancel',() => { if (timer) { clearTimeout(timer); timer = null; } });
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