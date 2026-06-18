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
  state.achievements = { ...fresh.achievements };
}

export function setTiles(next: TileState[][]) {
  tiles = next;
}

export function setBoardInitialized(val: boolean) {
  boardInitialized = val;
}

// ---- MPS ring buffer (5-second window) ----
// Stores the last N per-second earnings samples.
const MPS_WINDOW = 5;
const mpsRing: number[] = new Array(MPS_WINDOW).fill(0);
let mpsRingIdx = 0;
let mpsCurrentTick = 0; // accumulator for current second

export function addMpsAccum(amount: number) {
  mpsCurrentTick += amount;
}

/** Called once per second by the MPS timer to commit the current tick. */
export function commitMpsTick(): number {
  mpsRing[mpsRingIdx % MPS_WINDOW] = mpsCurrentTick;
  mpsRingIdx++;
  const rate = mpsCurrentTick;
  mpsCurrentTick = 0;
  return rate;
}

/** Returns the average earnings per second over the last 5 seconds. */
export function getMpsRate(): number {
  const sum = mpsRing.reduce((a, b) => a + b, 0);
  return sum / MPS_WINDOW;
}

// Legacy export so old call-sites still compile
export let mpsAccum = 0;