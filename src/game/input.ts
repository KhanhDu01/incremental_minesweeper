import { state, tiles, boardInitialized, setTiles, setBoardInitialized } from '../state/state';
import { createBoard, floodReveal, isBoardWon, toggleFlag } from '../board/board';
import { UPGRADE_MAP } from '../upgrades/upgrades';
import { formatMoney } from '../state/save';
import { renderBoard, refreshTile, getTileEl, drawCanvasFull, markTileDirty } from '../ui/renderer';
import { updateMineCounter, updateHUD, updatePrestigeBar, showToast, setSmiley } from '../ui/hud';
import { calcTileEarnings, earnMoney } from './money';
import { startGameTimer, stopGameTimer, setBoardTransitioning } from './timers';
import { checkAchievements, checkPerfectBoard } from './achievements';
import { getStartingTime, CONFIG } from '../config';
import { EMOJI_BOOM, EMOJI_BOARD_WIN, EMOJI_DEAD, EMOJI_WIN, EMOJI_MINE } from '../assets/index';

// ============================================================
//  TILE INTERACTION
// ============================================================

let _getFlagMode: () => boolean = () => false;
export function setFlagModeGetter(fn: () => boolean) { _getFlagMode = fn; }

let _newGame: () => void = () => {};
export function setNewGameCallback(fn: () => void) { _newGame = fn; }

export function onTileClick(r: number, c: number) {
  if (state.phase === 'won' || state.phase === 'lost') return;
  const tile = tiles[r][c];
  if (tile.isRevealed) return;

  if (_getFlagMode()) {
    if (!boardInitialized) return;
    toggleFlag(tiles, r, c, state.cols);
    refreshTile(r, c);
    updateMineCounter();
    return;
  }

  if (tile.isFlagged) return;

  if (!boardInitialized) {
    setTiles(createBoard(state.rows, state.cols, state.mineCount, r, c));
    setBoardInitialized(true);
    state.phase = 'playing';
    startGameTimer();
    renderBoard();
  }

  if (tiles[r][c].isMine) {
    hitMine(r, c);
    return;
  }

  const revealed = floodReveal(tiles, r, c, state.rows, state.cols);

  earnMoney(calcTileEarnings(revealed.length));
  revealed.forEach(([tr, tc]) => refreshTile(tr, tc));
  checkWin();
  updateMineCounter();
}

export function onTileRightClick(r: number, c: number) {
  if (state.phase === 'won' || state.phase === 'lost') return;
  if (!boardInitialized) return;
  const tile = tiles[r][c];
  if (tile.isRevealed) return;

  toggleFlag(tiles, r, c, state.cols);
  refreshTile(r, c);
  updateMineCounter();
}

// ============================================================
//  MINE HIT
// ============================================================

function hitMine(r: number, c: number) {
  state.phase = 'lost';
  stopGameTimer();
  setSmiley(EMOJI_DEAD);

  for (let tr = 0; tr < state.rows; tr++) {
    for (let tc = 0; tc < state.cols; tc++) {
      if (tiles[tr][tc].isMine) {
        tiles[tr][tc].isRevealed = true;
        const el = getTileEl(tr, tc);
        if (el) {
          el.classList.add('revealed');
          el.textContent = EMOJI_MINE;
          if (tr === r && tc === c) el.classList.add('mine-hit');
        } else {
          markTileDirty(tr, tc);
        }
      }
    }
  }
  // Flush all dirty mine tiles at once
  drawCanvasFull();

  showToast(`${EMOJI_BOOM} BOOM! Try again!`);
  setBoardTransitioning(true);
  setTimeout(() => {
    setBoardTransitioning(false);
    _newGame();
  }, 2000);
}

// ============================================================
//  WIN CHECK
//  Win condition: all safe tiles revealed AND all flags are on mines
// ============================================================

export function checkWin() {
  if (!isBoardWon(tiles, state.rows, state.cols, state.mineCount)) return;

  state.phase = 'won';
  stopGameTimer();
  setSmiley(EMOJI_WIN);

  state.boardsCleared++;
  state.totalBoardsCleared++;
  state.boardNumber++;

  // Board bonus — scaled by time remaining
  const bonusMultiplier = UPGRADE_MAP['board_clear_bonus'].effect(state.upgrades.board_clear_bonus);
  const base = state.mineCount * 20 * state.prestigeMultiplier;

  // Time bonus: ratio of time left vs total starting time (capped at timeBonusMax)
  const totalTime   = getStartingTime(state.prestigeCount) + UPGRADE_MAP['longer_timer'].effect(state.upgrades.longer_timer);
  const timeRatio   = totalTime > 0 ? Math.min(CONFIG.timeBonusMax, state.timeLeft / totalTime * CONFIG.timeBonusMax) : 1;
  const timeFactor  = 1 + timeRatio; // 1x to (1 + timeBonusMax)x multiplier
  const bonus = Math.floor(base * (bonusMultiplier + 1) * timeFactor);

  earnMoney(bonus);
  showToast(`${EMOJI_BOARD_WIN} Board cleared! +${formatMoney(bonus)} bonus!`);

  // Achievement checks
  checkPerfectBoard(state.timeLeft, totalTime);
  checkAchievements();

  updateHUD();
  updatePrestigeBar();

  setBoardTransitioning(true);
  setTimeout(() => {
    setBoardTransitioning(false);
    _newGame();
  }, 1500);
}