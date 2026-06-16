import type { TileState, GameState } from './types';
import { loadGame, resetGame } from './save';

// ============================================================
//  SHARED MUTABLE STATE
//  Single source of truth imported by all other modules.
// ============================================================

const _loaded = loadGame();
export let state: GameState = { ..._loaded, upgrades: { ..._loaded.upgrades } };
export let tiles: TileState[][] = [];
export let boardInitialized = false;

export function setState(next: Partial<GameState>) {
  Object.assign(state, next);
}

export function resetState() {
  const fresh = resetGame();
  Object.assign(state, fresh);
  state.upgrades = { ...fresh.upgrades };
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
export function resetMpsAccum() {
  mpsAccum = 0;
}