// ============================================================
//  MINESWEEPER CONSTRAINT-PROPAGATION SOLVER
// ============================================================

import type { TileState } from '../state/types';
import { neighbors } from './board';

const MAX_PROPAGATION_PASSES = 30;
const LARGE_BOARD_TILE_LIMIT = 250;

type SolverTile = {
  isMine: boolean;
  adjacentMines: number;
  revealed: boolean;
  flagged: boolean;
};

function cloneForSolver(tiles: TileState[][], rows: number, cols: number): SolverTile[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      isMine: tiles[r][c].isMine,
      adjacentMines: tiles[r][c].adjacentMines,
      revealed: false,
      flagged: false,
    }))
  );
}

function getNeighborCoords(r: number, c: number, rows: number, cols: number): [number, number][] {
  return neighbors()
    .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
    .filter(([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols);
}

function solverReveal(grid: SolverTile[][], r: number, c: number, rows: number, cols: number) {
  if (grid[r][c].revealed || grid[r][c].flagged || grid[r][c].isMine) return;
  grid[r][c].revealed = true;
  if (grid[r][c].adjacentMines === 0) {
    for (const [nr, nc] of getNeighborCoords(r, c, rows, cols)) {
      if (!grid[nr][nc].revealed) solverReveal(grid, nr, nc, rows, cols);
    }
  }
}

function propagate(grid: SolverTile[][], rows: number, cols: number): boolean {
  let progress = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c].revealed || grid[r][c].adjacentMines === 0) continue;

      const nbrs = getNeighborCoords(r, c, rows, cols);
      const unknown = nbrs.filter(([nr, nc]) => !grid[nr][nc].revealed && !grid[nr][nc].flagged);
      const flagged = nbrs.filter(([nr, nc]) => grid[nr][nc].flagged).length;
      const remainingMines = grid[r][c].adjacentMines - flagged;

      if (remainingMines < 0) continue;

      if (unknown.length === remainingMines && remainingMines > 0) {
        for (const [nr, nc] of unknown) {
          if (!grid[nr][nc].flagged) { grid[nr][nc].flagged = true; progress = true; }
        }
      }

      if (remainingMines === 0 && unknown.length > 0) {
        for (const [nr, nc] of unknown) {
          solverReveal(grid, nr, nc, rows, cols);
          progress = true;
        }
      }
    }
  }

  return progress;
}

export function isSolvable(
  tiles: TileState[][],
  rows: number,
  cols: number,
  startR: number,
  startC: number
): boolean {
  if (rows * cols > LARGE_BOARD_TILE_LIMIT) return true;

  const grid = cloneForSolver(tiles, rows, cols);
  solverReveal(grid, startR, startC, rows, cols);

  let passes = 0;
  while (passes < MAX_PROPAGATION_PASSES) {
    if (!propagate(grid, rows, cols)) break;
    passes++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c].isMine && !grid[r][c].revealed) return false;
    }
  }
  return true;
}