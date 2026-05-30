import type { TileState, GameState } from './types';
import { loadGame } from './save';

// ============================================================
//  SHARED MUTABLE STATE
//  Single source of truth imported by all other modules.
// ============================================================

export let state: GameState = loadGame();
export let tiles: TileState[][] = [];
export let boardInitialized = false;

export function setState(next: Partial<GameState>) {
  Object.assign(state, next);
}

export function setTiles(next: TileState[][]) {
  tiles = next;
}

export function setBoardInitialized(val: boolean) {
  boardInitialized = val;
}

// Money-per-second accumulator (written by timers, read by MPS ticker)
export let mpsAccum = 0;
export function addMpsAccum(amount: number) {
  mpsAccum += amount;
}
