import type { TileState } from '../state/types';
import { isSolvable } from './solver';
import {
  rebuildTileIndex,
  indexMarkRevealed,
  indexMarkFlagged,
  indexMarkUnflagged,
  isWonByIndex,
  getFlaggedCount,
  safeTileIndex,
  mineTileIndex,
} from '../state/tile-index';

function maxAttempts(rows: number, cols: number): number {
  return Math.max(20, Math.floor(50_000 / (rows * cols)));
}

export function createBoard(
  rows: number, cols: number, mineCount: number,
  safeR: number, safeC: number,
): TileState[][] {
  const attempts = maxAttempts(rows, cols);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const board = generateBoard(rows, cols, mineCount, safeR, safeC);
    if (isSolvable(board, rows, cols, safeR, safeC)) return board;
  }
  return generateBoard(rows, cols, mineCount, safeR, safeC);
}

function generateBoard(
  rows: number, cols: number, mineCount: number,
  safeR: number, safeC: number,
): TileState[][] {
  const tiles: TileState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0,
    }))
  );

  const forbidden = new Set<number>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeR + dr, nc = safeC + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
        forbidden.add(nr * cols + nc);
    }
  }

  let placed = 0;
  const totalCells = rows * cols;
  while (placed < mineCount && placed < totalCells - forbidden.size) {
    const idx = Math.floor(Math.random() * totalCells);
    const r = Math.floor(idx / cols), c = idx % cols;
    if (!tiles[r][c].isMine && !forbidden.has(idx)) {
      tiles[r][c].isMine = true;
      placed++;
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c].isMine) continue;
      let count = 0;
      for (const [dr, dc] of NEIGHBORS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tiles[nr][nc].isMine) count++;
      }
      tiles[r][c].adjacentMines = count;
    }
  }

  // Build incremental index after generating
  rebuildTileIndex(tiles, rows, cols);
  return tiles;
}

// Pre-allocated neighbor offsets — avoids re-creating the array each call
const NEIGHBORS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
];

export function neighbors(): [number, number][] { return NEIGHBORS; }

// ---- floodReveal — O(n) BFS with a ring-buffer queue (no .shift()) ----
// .shift() on a plain array is O(n); a head-pointer approach is O(1).
export function floodReveal(
  tiles: TileState[][],
  startR: number,
  startC: number,
  rows: number,
  cols: number,
): [number, number][] {
  const revealed: [number, number][] = [];

  // Pre-check
  const startTile = tiles[startR][startC];
  if (startTile.isFlagged || startTile.isRevealed || startTile.isMine) return revealed;

  // Use a flat Int32Array for the BFS queue — much faster than object arrays
  // Max possible queue size = rows * cols
  const queue = new Int32Array(rows * cols * 2);
  let head = 0, tail = 0;
  queue[tail++] = startR;
  queue[tail++] = startC;

  const visited = new Uint8Array(rows * cols); // faster than Set<number>
  visited[startR * cols + startC] = 1;

  while (head < tail) {
    const r = queue[head++];
    const c = queue[head++];
    const tile = tiles[r][c];

    if (tile.isFlagged || tile.isRevealed || tile.isMine) continue;

    tile.isRevealed = true;
    indexMarkRevealed(r * cols + c, false, false);
    revealed.push([r, c]);

    if (tile.adjacentMines === 0) {
      for (const [dr, dc] of NEIGHBORS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const nk = nr * cols + nc;
        if (visited[nk]) continue;
        visited[nk] = 1;
        queue[tail++] = nr;
        queue[tail++] = nc;
      }
    }
  }

  return revealed;
}

// ---- Index-backed replacements for the old O(n) scan helpers ----

/**
 * Returns up to `limit` safe tiles from the index.
 * Bots call this every tick — O(limit) instead of O(rows*cols).
 */
export function getSafeTilesFromIndex(cols: number, limit = Infinity): [number, number][] {
  const out: [number, number][] = [];
  for (const key of safeTileIndex) {
    out.push([Math.floor(key / cols), key % cols]);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Returns up to `limit` safe tiles nearest to (centerR, centerC).
 * Uses an expanding Chebyshev-radius search so it only touches tiles
 * close to the frontier — O(result_count * radius^2) worst case,
 * which is tiny compared to a full-board scan.
 */
export function getNearestSafeTiles(
  centerR: number,
  centerC: number,
  rows: number,
  cols: number,
  limit: number,
): [number, number][] {
  if (safeTileIndex.size === 0) return [];

  const out: [number, number][] = [];
  const maxRadius = Math.max(rows, cols);

  for (let radius = 0; radius <= maxRadius && out.length < limit; radius++) {
    const rMin = Math.max(0, centerR - radius);
    const rMax = Math.min(rows - 1, centerR + radius);
    const cMin = Math.max(0, centerC - radius);
    const cMax = Math.min(cols - 1, centerC + radius);

    for (let r = rMin; r <= rMax && out.length < limit; r++) {
      for (let c = cMin; c <= cMax && out.length < limit; c++) {
        // Skip interior — already covered by smaller radii
        if (radius > 0 && r > rMin && r < rMax && c > cMin && c < cMax) continue;
        if (safeTileIndex.has(r * cols + c)) {
          out.push([r, c]);
        }
      }
    }
  }

  return out;
}


/**
 * Returns up to `limit` mine tiles from the index (random order via Set iteration).
 */
export function getMineTilesFromIndex(cols: number, limit = Infinity): [number, number][] {
  const out: [number, number][] = [];
  for (const key of mineTileIndex) {
    out.push([Math.floor(key / cols), key % cols]);
    if (out.length >= limit) break;
  }
  return out;
}

/** O(1) — delegates to tileIndex. */
export function isBoardWon(
  _tiles: TileState[][], rows: number, cols: number, mineCount: number,
): boolean {
  return isWonByIndex(rows * cols, mineCount);
}

/** O(1) — delegates to tileIndex. */
export function countFlagged(
  _tiles: TileState[][], rows: number, cols: number,
): number {
  return getFlaggedCount(rows * cols);
}

// ---- Flag helpers that keep the index in sync ----

export function flagTile(
  tiles: TileState[][], r: number, c: number, cols: number,
): void {
  const tile = tiles[r][c];
  if (tile.isRevealed || tile.isFlagged) return;
  tile.isFlagged = true;
  indexMarkFlagged(r * cols + c, tile.isMine);
}

export function unflagTile(
  tiles: TileState[][], r: number, c: number, cols: number,
): void {
  const tile = tiles[r][c];
  if (!tile.isFlagged) return;
  tile.isFlagged = false;
  indexMarkUnflagged(r * cols + c, tile.isMine);
}

export function toggleFlag(
  tiles: TileState[][], r: number, c: number, cols: number,
): void {
  if (tiles[r][c].isFlagged) unflagTile(tiles, r, c, cols);
  else                        flagTile(tiles, r, c, cols);
}

// ---- Legacy helpers kept for callers that haven't migrated ----
export function getSafeTiles(_tiles: TileState[][], _rows: number, cols: number): [number, number][] {
  return getSafeTilesFromIndex(cols);
}
export function getMineTiles(_tiles: TileState[][], _rows: number, cols: number): [number, number][] {
  return getMineTilesFromIndex(cols);
}

/** Fisher-Yates shuffle */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}