import type { TileState } from '../types';
import { isSolvable } from '../helper/solver';

const MAX_ATTEMPTS = 50; // try up to 50 times to get a solvable board

export function createBoard(rows: number, cols: number, mineCount: number, safeR: number, safeC: number): TileState[][] {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const board = generateBoard(rows, cols, mineCount, safeR, safeC);
    if (isSolvable(board, rows, cols, safeR, safeC)) return board;
  }
  // Fallback: return last attempt even if not perfectly solvable
  return generateBoard(rows, cols, mineCount, safeR, safeC);
}

function generateBoard(rows: number, cols: number, mineCount: number, safeR: number, safeC: number): TileState[][] {
  // Place mines avoiding the first-click area
  const tiles: TileState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );

  const forbidden = new Set<number>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeR + dr;
      const nc = safeC + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        forbidden.add(nr * cols + nc);
      }
    }
  }

  let placed = 0;
  const totalCells = rows * cols;
  while (placed < mineCount && placed < totalCells - forbidden.size) {
    const idx = Math.floor(Math.random() * totalCells);
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    if (!tiles[r][c].isMine && !forbidden.has(idx)) {
      tiles[r][c].isMine = true;
      placed++;
    }
  }

  // Compute adjacentMines
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c].isMine) continue;
      let count = 0;
      for (const [dr, dc] of neighbors()) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tiles[nr][nc].isMine) count++;
      }
      tiles[r][c].adjacentMines = count;
    }
  }

  return tiles;
}

export function neighbors(): [number, number][] {
  return [
    [-1, -1], [-1, 0], [-1, 1],
    [0,  -1],           [0,  1],
    [1,  -1], [1,  0], [1,  1],
  ];
}

// Flood fill reveal - returns list of newly revealed [r,c] positions
export function floodReveal(
  tiles: TileState[][],
  startR: number,
  startC: number,
  rows: number,
  cols: number
): [number, number][] {
  const revealed: [number, number][] = [];
  const queue: [number, number][] = [[startR, startC]];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = r * cols + c;
    if (visited.has(key)) continue;
    visited.add(key);

    if (tiles[r][c].isFlagged || tiles[r][c].isRevealed || tiles[r][c].isMine) continue;

    tiles[r][c].isRevealed = true;
    revealed.push([r, c]);

    if (tiles[r][c].adjacentMines === 0) {
      for (const [dr, dc] of neighbors()) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          queue.push([nr, nc]);
        }
      }
    }
  }

  return revealed;
}

// Reveal a rectangular area (for Big Shovel upgrade)
export function revealArea(
  tiles: TileState[][],
  centerR: number,
  centerC: number,
  radius: number,
  rows: number,
  cols: number
): [number, number][] {
  const allRevealed: [number, number][] = [];
  const halfSize = Math.floor(radius / 2);

  for (let dr = -halfSize; dr <= halfSize; dr++) {
    for (let dc = -halfSize; dc <= halfSize; dc++) {
      const nr = centerR + dr;
      const nc = centerC + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const tile = tiles[nr][nc];
      if (tile.isRevealed || tile.isFlagged || tile.isMine) continue;
      const newReveal = floodReveal(tiles, nr, nc, rows, cols);
      allRevealed.push(...newReveal);
    }
  }
  return allRevealed;
}

// Get all unrevealed, non-flagged, non-mine tiles
export function getSafeTiles(tiles: TileState[][], rows: number, cols: number): [number, number][] {
  const safe: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = tiles[r][c];
      if (!t.isRevealed && !t.isFlagged && !t.isMine) safe.push([r, c]);
    }
  }
  return safe;
}

// Get all unrevealed, non-flagged mine tiles
export function getMineTiles(tiles: TileState[][], rows: number, cols: number): [number, number][] {
  const mines: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = tiles[r][c];
      if (!t.isRevealed && !t.isFlagged && t.isMine) mines.push([r, c]);
    }
  }
  return mines;
}

export function countFlagged(tiles: TileState[][], rows: number, cols: number): number {
  let count = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (tiles[r][c].isFlagged) count++;
  return count;
}

export function isBoardWon(tiles: TileState[][], rows: number, cols: number, mineCount: number): boolean {
  let revealed = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (tiles[r][c].isRevealed) revealed++;
  return revealed === rows * cols - mineCount;
}
