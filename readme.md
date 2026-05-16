# Mournival

> A co-op roguelike deckbuilder where DnD-style parties cast poker hands at monsters. Web prototype.

*Mournival* (n.) — a 16th-century card-game term for a four-of-a-kind. From Old French, possibly with a "mournful" overtone. The strongest hand in the Tudor card game **Gleek**, the forgotten ancestor of poker.

---

## What this is

Balatro meets Dungeons & Dragons, played in your browser with friends. Each player runs their own deck, hand, and joker loadout, and plays poker hands as attacks against a shared monster. Coordinate, combo, and survive long enough to clear the dungeon.

**1–4 players.** Solo is fully supported; multiplayer is real-time via WebSockets.

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | npm workspaces |
| Language | TypeScript 5.5 |
| Client | React 18 + Vite 5, Zustand, socket.io-client |
| Server | Node.js, Express 4, socket.io 4 |
| Shared | Pure TypeScript — no runtime deps |
| Testing | Vitest 2 + @vitest/coverage-v8 |

Three packages: `@mournival/shared` (game logic), `@mournival/client` (React SPA), `@mournival/server` (socket server).

---

## Getting started

```bash
npm install
npm run dev        # starts server + client concurrently
```

Client runs at `http://localhost:5173`. Server runs at `http://localhost:3000`.

```bash
npm run build      # production build (shared → server → client)
npm run typecheck  # type-check all packages
npm test           # run shared test suite
npm run coverage   # coverage report (80% threshold enforced)
```

---

## Project layout

```
mournival/
├── packages/
│   ├── shared/         # @mournival/shared — game logic + types
│   │   └── src/
│   │       ├── types.ts        # all interfaces and enums
│   │       ├── cards.ts        # deck, shuffle, deal
│   │       ├── hands.ts        # hand evaluation (13 types)
│   │       ├── scoring.ts      # chips × mult damage engine
│   │       ├── classes.ts      # player class definitions
│   │       ├── monsters.ts     # monster definitions
│   │       ├── jokers.ts       # joker card definitions
│   │       ├── consumables.ts  # arcana + celestial stone effects
│   │       ├── gameLogic.ts    # core state machine
│   │       ├── index.ts        # barrel export
│   │       └── __tests__/      # 187 tests, ≥97% statement coverage
│   ├── client/         # @mournival/client — React SPA
│   │   └── src/
│   │       ├── components/     # UI components
│   │       ├── store/          # Zustand game store
│   │       ├── socket.ts       # typed socket.io-client singleton
│   │       └── index.css       # full design system (midnight teal palette)
│   └── server/         # @mournival/server — socket.io game server
│       └── src/
│           ├── index.ts        # socket event handlers
│           └── rooms.ts        # in-memory room registry
└── .claude/
    ├── mournival-deps.html     # interactive dependency graph
    └── mournival-deps.json     # dependency graph data
```

---

## Core mechanics

**Scoring:** Each poker hand produces `chips × multiplier = damage`. Cards contribute chip values; jokers, enhancements, and class abilities modify both. Damage is dealt to a shared monster HP pool.

**Hand types:** High card through flush five (13 total). Hands can be leveled up via Celestial Stone consumables.

**Classes:** Warrior, Rogue, Mage, Cleric, Ranger — each with a passive scoring bonus tied to specific hand types.

**Card enhancements:** Bonus (extra chips), Mult (extra mult), Glass (×2 mult, breaks on use), Steel (×1.5 mult while held), Gold (earn gold when scored), Wild (counts as any suit).

**Jokers:** Passive modifiers held between rounds. Purchased in the shop between floors.

**Consumables:** Arcana cards (16 effects: enhance cards, change suits, destroy for gold, etc.) and Celestial Stones (level up a specific hand type). Consumed on use.

**The Mournival:** When all active players simultaneously play Four of a Kind or better in the same round, party damage is multiplied by 4.

**Progression:** Floors → Rooms → Monster → Shop → repeat. Each shop offers jokers, consumables, and hand level upgrades for gold.

---

## Testing

```bash
npm test            # run once
npm run coverage    # with coverage report
```

Tests live in `packages/shared/src/__tests__/`. Coverage threshold: 80% across statements, branches, functions, and lines. Current: ~97% statements, ~89% branches, 100% functions.

---

## Status

**Working:**
- Multiplayer lobby (create/join room by code)
- Class selection (Warrior, Rogue, Mage, Cleric, Ranger)
- Full combat loop: deal → select → play hand / discard → round result → advance
- Balatro-style scoring engine with joker and card enhancement effects
- Shop phase: buy jokers, buy consumables, level up hands, end shop
- Consumable use during combat (Arcana and Celestial Stones) with card targeting
- Live scoring preview (chips × mult = damage) in sidebar
- The Mournival team combo (×4 damage on coordinated four-of-a-kind+)
- Player death and spectator mode
- Game log
- 187 unit tests covering all shared game logic

**Not yet implemented — see [PLANNING.md](PLANNING.md)**

---

## License

All rights reserved — see `LICENSE`. This repository is public for transparency and reference. You may read the code but may not copy, modify, distribute, or sell it without permission.

---

*A mournival of aces beats everything.*
