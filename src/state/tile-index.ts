// ============================================================
//  TILE INDEX
//  Incremental O(1) sets replacing O(n) getSafeTiles /
//  getMineTiles scans and O(n) isBoardWon scan.
//
//  Keys are encoded as  r * cols + c  (integer).
//
//  Rules:
//    safeTileIndex  = unrevealed, unflagged, NOT mine
//    mineTileIndex  = unrevealed, unflagged, IS mine
//    revealedCount  = total revealed tiles this board
//    wrongFlagCount = flags placed on non-mine tiles
// ============================================================

export let safeTileIndex  = new Set<number>();
export let mineTileIndex  = new Set<number>();
export let revealedCount  = 0;
export let wrongFlagCount = 0;

import type { TileState } from './types';

/** Full rebuild — call once after createBoard / setTiles. */
export function rebuildTileIndex(
  tiles: TileState[][],
  rows: number,
  cols: number,
): void {
  safeTileIndex  = new Set();
  mineTileIndex  = new Set();
  revealedCount  = 0;
  wrongFlagCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t   = tiles[r][c];
      const key = r * cols + c;
      if (t.isRevealed) {
        revealedCount++;
      } else if (t.isFlagged) {
        if (!t.isMine) wrongFlagCount++;
      } else {
        if (t.isMine) mineTileIndex.add(key);
        else          safeTileIndex.add(key);
      }
    }
  }
}

/** Call after a tile is revealed (bot or player). */
export function indexMarkRevealed(key: number, wasFlagged: boolean, isMine: boolean): void {
  safeTileIndex.delete(key);
  mineTileIndex.delete(key);
  revealedCount++;
  // If it was wrongly flagged and now revealed, fix the count
  if (wasFlagged && !isMine) wrongFlagCount--;
}

/** Call after a flag is placed on a tile. */
export function indexMarkFlagged(key: number, isMine: boolean): void {
  safeTileIndex.delete(key);
  mineTileIndex.delete(key);
  if (!isMine) wrongFlagCount++;
}

/** Call after a flag is removed from a tile. */
export function indexMarkUnflagged(key: number, isMine: boolean): void {
  if (!isMine) wrongFlagCount--;
  // Tile goes back into the appropriate set
  if (isMine) mineTileIndex.add(key);
  else        safeTileIndex.add(key);
}

/** O(1) win check — replaces the O(n) isBoardWon scan. */
export function isWonByIndex(totalCells: number, mineCount: number): boolean {
  // Win requires ALL of:
  //   1. every safe tile is revealed
  //   2. every mine is flagged (mineTileIndex empty = no unflagged mines left)
  //   3. no flags placed on safe tiles (wrongFlagCount === 0)
  return revealedCount === totalCells - mineCount
    && mineTileIndex.size === 0
    && wrongFlagCount === 0;
}

/** O(1) flagged count for mine counter display. */
export function getFlaggedCount(totalCells: number): number {
  // flaggedCount = totalCells - revealedCount - safeTileIndex.size - mineTileIndex.size
  return totalCells - revealedCount - safeTileIndex.size - mineTileIndex.size;
}