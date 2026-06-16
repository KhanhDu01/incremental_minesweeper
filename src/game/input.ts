import { state, tiles, boardInitialized, setTiles, setBoardInitialized } from '../state/state';
import { createBoard, floodReveal, revealArea, isBoardWon } from '../board/board';
import { UPGRADE_MAP } from '../upgrades/upgrades';
import { formatMoney } from '../state/save';
import { renderBoard, refreshTile, getTileEl } from '../ui/renderer';
import { updateMineCounter, updateHUD, updatePrestigeBar, showToast, setSmiley } from '../ui/hud';
import { calcTileEarnings, earnMoney } from './money';
import { startGameTimer, stopGameTimer, setBoardTransitioning } from './timers';

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
    tile.isFlagged = !tile.isFlagged;
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

  const revealRadius = UPGRADE_MAP['reveal_area'].effect(state.upgrades.reveal_area);
  const revealed = revealRadius > 1
    ? revealArea(tiles, r, c, revealRadius, state.rows, state.cols)
    : floodReveal(tiles, r, c, state.rows, state.cols);

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

  tile.isFlagged = !tile.isFlagged;
  refreshTile(r, c);
  updateMineCounter();
}

// ============================================================
//  MINE HIT
// ============================================================

function hitMine(r: number, c: number) {
  state.phase = 'lost';
  stopGameTimer();
  setSmiley('😵');

  for (let tr = 0; tr < state.rows; tr++) {
    for (let tc = 0; tc < state.cols; tc++) {
      if (tiles[tr][tc].isMine) {
        tiles[tr][tc].isRevealed = true;
        const el = getTileEl(tr, tc);
        if (el) {
          el.classList.add('revealed');
          el.textContent = '💣';
          if (tr === r && tc === c) el.classList.add('mine-hit');
        }
      }
    }
  }

  showToast('💥 BOOM! Try again!');
  setBoardTransitioning(true);
  setTimeout(() => {
    setBoardTransitioning(false);
    _newGame();
  }, 2000);
}

// ============================================================
//  WIN CHECK
// ============================================================

export function checkWin() {
  if (!isBoardWon(tiles, state.rows, state.cols, state.mineCount)) return;

  state.phase = 'won';
  stopGameTimer();
  setSmiley('😎');

  state.boardsCleared++;
  state.boardNumber++;

  const bonusMultiplier = UPGRADE_MAP['board_clear_bonus'].effect(state.upgrades.board_clear_bonus);
  const base  = state.mineCount * 20 * state.prestigeMultiplier;
  const bonus = Math.floor(base * (bonusMultiplier + 1));

  earnMoney(bonus);
  showToast(`🏆 Board cleared! +${formatMoney(bonus)} bonus!`);

  updateHUD();
  updatePrestigeBar();

  // Lock out bots for the 1.5s celebration window, then start next board.
  setBoardTransitioning(true);
  setTimeout(() => {
    setBoardTransitioning(false);
    _newGame();
  }, 1500);
}