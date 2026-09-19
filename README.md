# MineSweeper Inc. 

An incremental/idle minesweeper game built with TypeScript + Vite, deployed to GitHub Pages.

**Play it:** https://khanhdu01.github.io/incremental_minesweeper/

---

## Features

### Core Gameplay
- Classic minesweeper on a 7×7 board (grows with prestige)
- **Win condition:** All safe tiles revealed **and** all flags placed correctly on mines
- **Board clear bonus** scales with time remaining — finish fast for bigger payouts
- Countdown timer per board; lose it and the board resets

### Prestige System
- Prestige unlocks are gated on **total boards cleared** (never resets between prestiges)
- Each prestige level increases board size (+3 cols/rows) and earnings multiplier (+0.5×)
- Upgrades reset on prestige; your prestige multiplier stays forever

### Upgrades
| Upgrade | Effect |
|---|---|
| Better Pickaxe | More $ per tile cleared |
| Board Bonus | Bigger clear bonuses (boosted by time left) |
| Overtime | More seconds on the countdown timer |
| Mine Detector | Auto-flags mines (earns money per flag) |
| Faster Detector | Speeds up flagging bots; every 10 levels adds a new bot |
| Auto-Miner | Auto-clears safe tiles |
| Faster Miner | Speeds up mining bots; every 10 levels adds a new bot |

### Automation (Bots)
- Auto-miners start each board from the **center tile** (safe first click), then expand outward
- Auto-flaggers place flags **randomly** across the mine field
- Multiple bots operate in parallel; each bot group interval resets when a new bot unlocks
- Bots can be paused with the ▶/⏸ toggle on the Auto-Miner upgrade

### Offline Earnings
- Earnings accumulate while the tab is closed, based on your current bot setup
- Capped at 8 hours; 50% efficiency vs active play
- Notified with the amount earned on next load

### Money Per Second (MPS)
- MPS is averaged over a **5-second rolling window** for a smoother display

### Achievements
16 achievements across boards cleared, money earned, prestige milestones, and automation feats.

### Quality of Life
- Zoom in/out controls; **zoom persists** within a prestige (only auto-refits when board size changes)
- Flag mode toggle (mobile long-press also works)
- Canvas rendering for small tile sizes (zoomed way out)
- Dev panel (🛠️) for testing upgrades, prestige levels, boards cleared, and achievements

---

## Project Structure

```
src/
├── assets/
│   └── index.ts          
├── board/
│   ├── board.ts           # Board generation, flood reveal, win check
│   └── solver.ts          # Constraint-propagation solvability checker
├── game/
│   ├── achievements.ts    # Achievement definitions and unlock logic
│   ├── game.ts            # Orchestrator: init, newGame, tab setup
│   ├── input.ts           # Tile click/right-click handlers
│   ├── money.ts           # Earnings calculations
│   ├── offline.ts         # Offline earnings on load
│   ├── prestige.ts        # Prestige logic
│   └── timers.ts          # Game timer, auto-clear/flag bots, MPS, save
├── state/
│   ├── save.ts            # Save/load/reset, formatting helpers, migration
│   ├── state.ts           # Shared mutable state, MPS ring buffer
│   └── types.ts           # TypeScript types
├── ui/
│   ├── achievementsUI.ts  # Achievements tab renderer
│   ├── adSpace.ts         # Ad panel (unused by default)
│   ├── devPanel.ts        # Developer tools panel
│   ├── dom.ts             # Cached DOM references
│   ├── hud.ts             # Header, timer, mine counter, prestige bar
│   ├── renderer.ts        # Board DOM/canvas rendering
│   └── toolbar.ts         # Flag mode, zoom, auto-fit logic
├── upgrades/
│   ├── upgrades.ts        # Upgrade definitions and cost formulas
│   └── upgrades-ui.ts     # Upgrades tab renderer and buy logic
├── config.ts              # All game constants and derived helpers
├── global.d.ts            # Window type augmentations
├── main.ts                # Entry point
└── style.css              # Win95-style CSS
```

---

## Save Format

Saves use `localStorage` key `incremental_minesweeper_save_v4`. On first load with a `v3` save, data is automatically migrated (removed `reveal_area` upgrade, added `totalBoardsCleared` seeded from `boardsCleared`).

---

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # preview the build
```

Deployed automatically via GitHub Pages on push to `main`.

---
