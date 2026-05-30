# MineSweeper Inc. 💣💰

An incremental minesweeper game with a classic Win95 aesthetic.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
minesweeper/
├── index.html          # Entry point
├── src/
│   ├── main.ts         # Bootstrap
│   ├── game.ts         # Main game engine (state, timers, UI)
│   ├── board.ts        # Board logic (generation, flood fill, etc.)
│   ├── upgrades.ts     # Upgrade definitions & cost formulas
│   ├── save.ts         # Save/load, formatting helpers
│   ├── types.ts        # TypeScript types
│   └── style.css       # Win95 minesweeper aesthetic
└── public/
    └── manifest.json   # PWA manifest
```

## Features implemented

- ✅ Classic minesweeper (9x9, first-click safe)
- ✅ Money per tile cleared
- ✅ Board clear bonuses
- ✅ Countdown timer
- ✅ All 8 upgrades
- ✅ Auto-clear & auto-flag with speed upgrades
- ✅ Prestige system (board grows, multiplier increases)
- ✅ Save/load via localStorage
- ✅ Mobile-friendly (44px+ touch targets, long-press to flag)
- ✅ PWA manifest (installable)

## Mobile / PWA

The game is designed mobile-first:
- Tiles are `clamp(28px, 8vw, 44px)` — always finger-friendly
- Long press on a tile to flag it (instead of right-click)
- PWA manifest included for home screen installation
- Add Capacitor later for App Store / Play Store deployment

## Next steps

- [ ] Infinity mode with permanent upgrades
- [ ] Infinity points currency
- [ ] Prestige permanent upgrades
- [ ] Sound effects
- [ ] Particle effects on board clear
- [ ] Capacitor for native mobile
