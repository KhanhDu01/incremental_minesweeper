import type { TileState } from '../state/types';
import { isSolvable } from './solver';

function maxAttempts(rows: number, cols: number): number {
  return Math.max(20, Math.floor(50_000 / (rows * cols)));
}

export function createBoard(rows: number, cols: number, mineCount: number, safeR: number, safeC: number): TileState[][] {
  const attempts = maxAttempts(rows, cols);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const board = generateBoard(rows, cols, mineCount, safeR, safeC);
    if (isSolvable(board, rows, cols, safeR, safeC)) return board;
  }
  return generateBoard(rows, cols, mineCount, safeR, safeC);
}

function generateBoard(rows: number, cols: number, mineCount: number, safeR: number, safeC: number): TileState[][] {
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

/**
 * Board is won when:
 * - All non-mine tiles are revealed, AND
 * - All flagged tiles are actually mines (no wrong flags)
 */
export function isBoardWon(tiles: TileState[][], rows: number, cols: number, mineCount: number): boolean {
  let revealed = 0;
  let wrongFlags = 0;
  let correctFlags = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = tiles[r][c];
      if (t.isRevealed) revealed++;
      if (t.isFlagged && !t.isMine) wrongFlags++;
      if (t.isFlagged && t.isMine)  correctFlags++;
    }
  }

  // All safe tiles revealed AND no wrong flags placed
  const allSafeRevealed = revealed === rows * cols - mineCount;
  return allSafeRevealed && wrongFlags === 0;
}

/** Shuffle array in place (Fisher-Yates) */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}