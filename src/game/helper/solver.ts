// ============================================================
//  MINESWEEPER CONSTRAINT-PROPAGATION SOLVER
//  Returns true if the board can be fully solved without guessing,
//  starting from the given revealed seed tile.
// ============================================================

import type { TileState } from '../types';
import { neighbors } from '../components/board';

type SolverTile = {
  isMine: boolean;
  adjacentMines: number;
  // solver state
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

// Flood-fill reveal on solver grid (mirrors game logic)
function solverReveal(grid: SolverTile[][], r: number, c: number, rows: number, cols: number) {
  if (grid[r][c].revealed || grid[r][c].flagged || grid[r][c].isMine) return;
  grid[r][c].revealed = true;
  if (grid[r][c].adjacentMines === 0) {
    for (const [nr, nc] of getNeighborCoords(r, c, rows, cols)) {
      if (!grid[nr][nc].revealed) solverReveal(grid, nr, nc, rows, cols);
    }
  }
}

// One pass of constraint propagation. Returns true if any progress was made.
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

      // All remaining neighbours are mines → flag them
      if (unknown.length === remainingMines && remainingMines > 0) {
        for (const [nr, nc] of unknown) {
          if (!grid[nr][nc].flagged) {
            grid[nr][nc].flagged = true;
            progress = true;
          }
        }
      }

      // All mines accounted for → reveal unknowns
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

// Returns true if the board can be solved from (startR, startC) without guessing
export function isSolvable(
  tiles: TileState[][],
  rows: number,
  cols: number,
  startR: number,
  startC: number
): boolean {
  const grid = cloneForSolver(tiles, rows, cols);

  // Simulate first click
  solverReveal(grid, startR, startC, rows, cols);

  // Keep applying constraints until no more progress
  let progressed = true;
  while (progressed) {
    progressed = propagate(grid, rows, cols);
  }

  // Check if all non-mine tiles are revealed
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c].isMine && !grid[r][c].revealed) return false;
    }
  }
  return true;
}
