import type { TileState } from '../state/types';
import { state, tiles, setTiles, setBoardInitialized } from '../state/state';
import { boardEl } from './dom';
import { EMOJI_FLAG_TILE } from '../assets/index';
import { rebuildTileIndex } from '../state/tile-index';

type ClickHandler = (r: number, c: number) => void;
let _onTileClick: ClickHandler = () => {};
let _onTileRightClick: ClickHandler = () => {};

export function setTileHandlers(click: ClickHandler, rightClick: ClickHandler) {
  _onTileClick = click;
  _onTileRightClick = rightClick;
}

// Force canvas when tile count exceeds this (DOM is catastrophic beyond ~5k elements)
const CANVAS_THRESHOLD_TILES = 5_000;
const CANVAS_THRESHOLD_PX    = 6;

let usingCanvas = false;
let canvasEl: HTMLCanvasElement | null = null;
let canvasCtx: CanvasRenderingContext2D | null = null;
let canvasPx = 1; // current tile pixel size on canvas

// Tracks the last tile px we actually rendered DOM tiles at, so resizeCanvas
// can skip a full rebuild when nothing actually changed (e.g. repeated calls
// from tab-switch / window-resize handlers that fire even when zoom didn't).
let lastDomTilePx = -1;

// ---- Dirty-region tracking for partial redraws ----
let dirtyKeys = new Set<number>(); // encoded as r * cols + c
let fullRedrawPending = false;

export function markTileDirty(r: number, c: number) {
  dirtyKeys.add(r * state.cols + c);
}

export function markFullRedraw() {
  fullRedrawPending = true;
  dirtyKeys.clear();
}

export function renderBoard() {
  const { rows, cols } = state;

  if (tiles.length === 0) {
    setTiles(Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0,
      }))
    ));
    setBoardInitialized(false);
    rebuildTileIndex(tiles, rows, cols);
  }

  const tileSize = getTileSize();
  const tileCount = rows * cols;
  usingCanvas = tileCount > CANVAS_THRESHOLD_TILES || tileSize < CANVAS_THRESHOLD_PX;

  boardEl.innerHTML = '';
  canvasEl  = null;
  canvasCtx = null;
  dirtyKeys.clear();
  fullRedrawPending = false;

  if (usingCanvas) {
    renderCanvas(rows, cols, tileSize);
  } else {
    renderDom(rows, cols, tileSize);
    lastDomTilePx = tileSize;
  }
}

// ---- Canvas rendering ----

function renderCanvas(rows: number, cols: number, tileSize: number) {
  const canvas = document.createElement('canvas');
  canvasPx = Math.max(1, tileSize);
  canvas.width  = cols * canvasPx;
  canvas.height = rows * canvasPx;
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'pixelated';
  canvasEl  = canvas;
  canvasCtx = canvas.getContext('2d');

  canvas.addEventListener('click', (e) => {
    const [r, c] = canvasCoords(e, canvas);
    if (r >= 0) _onTileClick(r, c);
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const [r, c] = canvasCoords(e, canvas);
    if (r >= 0) _onTileRightClick(r, c);
  });

  boardEl.style.width  = `${canvas.width}px`;
  boardEl.style.height = `${canvas.height}px`;
  boardEl.appendChild(canvas);
  drawCanvasFull();
}

/**
 * Called by applyZoom whenever tile-size changes.
 * Canvas mode: resizes the canvas buffer in-place and redraws — no element churn.
 * DOM mode: only rebuilds tile elements if the pixel size actually changed,
 * since unconditionally calling renderBoard() here would wipe and recreate
 * every tile div (losing click listeners momentarily) on every tab switch.
 */
export function resizeCanvas(newTilePx: number) {
  if (!usingCanvas) {
    if (newTilePx === lastDomTilePx) return; // no-op, nothing actually changed
    lastDomTilePx = newTilePx;
    renderBoard();
    return;
  }
  if (!canvasEl || !canvasCtx) return;
  const { rows, cols } = state;
  canvasPx = Math.max(1, newTilePx);
  canvasEl.width  = cols * canvasPx;
  canvasEl.height = rows * canvasPx;
  boardEl.style.width  = `${canvasEl.width}px`;
  boardEl.style.height = `${canvasEl.height}px`;
  dirtyKeys.clear();
  fullRedrawPending = false;
  drawCanvasFull();
}

function canvasCoords(e: MouseEvent, canvas: HTMLCanvasElement): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top)  * scaleY;
  const c = Math.floor(x / canvasPx);
  const r = Math.floor(y / canvasPx);
  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return [-1, -1];
  return [r, c];
}

// Pre-computed colour strings
const COLOR_UNREVEALED = '#5a5a5a';
const COLOR_FLAGGED     = '#c04000';
const COLOR_REVEALED_0  = '#e8e8e8';
const COLOR_REVEALED_N  = '#a0a0a0';
const COLOR_MINE        = '#cc0000';
const COLOR_BORDER_LT   = '#ffffff';
const COLOR_BORDER_DK   = '#808080';
const COLOR_BORDER_THIN = '#404040';
const COLOR_FLAG_DOT    = '#ff4400';

// Number colours matching the classic minesweeper palette used by DOM tiles
const NUMBER_COLORS = [
  '',        // 0 — not drawn
  '#0000ff', // 1
  '#008000', // 2
  '#ff0000', // 3
  '#000080', // 4
  '#800000', // 5
  '#008080', // 6
  '#000000', // 7
  '#808080', // 8
];

function tileCanvasColor(tile: TileState): string {
  if (tile.isRevealed) {
    if (tile.isMine)            return COLOR_MINE;
    if (tile.adjacentMines > 0) return COLOR_REVEALED_N;
    return COLOR_REVEALED_0;
  }
  if (tile.isFlagged) return COLOR_FLAGGED;
  return COLOR_UNREVEALED;
}

function drawTileToCanvas(ctx: CanvasRenderingContext2D, r: number, c: number, px: number) {
  const tile = tiles[r][c];
  const x = c * px;
  const y = r * px;

  ctx.fillStyle = tileCanvasColor(tile);
  ctx.fillRect(x, y, px, px);

  if (px >= 3) {
    if (!tile.isRevealed) {
      ctx.fillStyle = COLOR_BORDER_LT;
      ctx.fillRect(x, y, px - 1, 1);
      ctx.fillRect(x, y, 1, px - 1);
      ctx.fillStyle = COLOR_BORDER_DK;
      ctx.fillRect(x + px - 1, y, 1, px);
      ctx.fillRect(x, y + px - 1, px, 1);
    } else {
      ctx.fillStyle = COLOR_BORDER_DK;
      ctx.fillRect(x, y, px, 1);
      ctx.fillRect(x, y, 1, px);
    }
  } else {
    ctx.fillStyle = COLOR_BORDER_THIN;
    ctx.fillRect(x + px - 1, y, 1, px);
    ctx.fillRect(x, y + px - 1, px, 1);
  }

  if (tile.isFlagged && !tile.isRevealed && px >= 2) {
    ctx.fillStyle = COLOR_FLAG_DOT;
    const dot    = Math.max(1, Math.floor(px * 0.4));
    const offset = Math.floor((px - dot) / 2);
    ctx.fillRect(x + offset, y + offset, dot, dot);
  }

  // Draw adjacency number — only visible when tile is revealed, not a mine,
  // and the tile is large enough to show text (>= 8px)
  if (tile.isRevealed && !tile.isMine && tile.adjacentMines > 0 && px >= 8) {
    const fontSize = Math.floor(px * 0.6);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = NUMBER_COLORS[tile.adjacentMines] ?? '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tile.adjacentMines), x + px / 2, y + px / 2);
  }
}

export function drawCanvasFull() {
  if (!canvasEl || !canvasCtx) return;
  const { rows, cols } = state;
  const px = canvasPx;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      drawTileToCanvas(canvasCtx, r, c, px);
    }
  }
  dirtyKeys.clear();
  fullRedrawPending = false;
}

export function flushDirtyTiles() {
  if (!canvasEl || !canvasCtx) return;
  if (fullRedrawPending) { drawCanvasFull(); return; }
  if (dirtyKeys.size === 0) return;
  const px   = canvasPx;
  const cols = state.cols;
  for (const key of dirtyKeys) {
    const r = Math.floor(key / cols);
    const c = key % cols;
    drawTileToCanvas(canvasCtx, r, c, px);
  }
  dirtyKeys.clear();
}

// Legacy alias
export function drawCanvas() { drawCanvasFull(); }

// ---- DOM rendering ----

function renderDom(rows: number, cols: number, tileSize: number) {
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
  boardEl.style.width  = `${cols * tileSize}px`;
  boardEl.style.height = `${rows * tileSize}px`;

  const frag = document.createDocumentFragment();
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
      frag.appendChild(el);
    }
  }
  boardEl.appendChild(frag);
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

/**
 * Immediately paints a single tile's current state.
 * In canvas mode this draws directly (not just marking dirty) so player
 * clicks feel instant rather than waiting for the next batched bot flush.
 * Bots that want batching should use markTileDirty() + flushDirtyTiles()
 * themselves (see timers.ts) instead of calling this per-tile in a loop.
 */
export function refreshTile(r: number, c: number) {
  if (usingCanvas) {
    if (canvasCtx) {
      drawTileToCanvas(canvasCtx, r, c, canvasPx);
    }
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
    timer = setTimeout(() => { if (!moved) callback(); timer = null; }, 150);
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
    flushDirtyTiles();
    return;
  }
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      refreshTile(r, c);
    }
  }
}