# Mournival
 
> A co-op roguelike deckbuilder where DnD-style parties cast poker hands at monsters. Web prototype.
 
*Mournival* (n.) — a 16th-century card-game term for a four-of-a-kind. From Old French, possibly with a "mournful" overtone. The strongest hand in the Tudor card game **Gleek**, the forgotten ancestor of poker.
 
---
 
## What this is
 
Balatro meets Dungeons & Dragons, played in your browser with friends. Each player runs their own deck, hand, and joker loadout, and plays poker hands as attacks against a shared monster. Coordinate, combo, and survive long enough to clear the dungeon.

**1–4 players.** Solo is fully supported; multiplayer is real-time via WebSockets.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + Socket.io |
| Game logic | `@mournival/shared` — pure TypeScript, no runtime deps |
| State (client) | Zustand |
| Monorepo | npm workspaces |

## Getting started

```bash
npm install
npm run dev        # starts server (:3001) and client (:5173) concurrently
```

Open [http://localhost:5173](http://localhost:5173). Create a game, share the room code with up to 3 friends.

## Project layout

```
packages/
  shared/      Pure game logic: cards, hand eval, scoring engine, classes,
               monsters, jokers, state machine. No browser or Node deps.
  server/      Express + Socket.io server. Authoritative game state.
  client/      React app. Connects via Socket.io, renders game state.
```

### Core game loop

1. Players join a lobby with a room code and pick a DnD class
2. Each room spawns a monster; all players draw 8 cards
3. Each player selects 1–5 cards to play as a poker hand (simultaneously)
4. When all players are ready the server resolves all hands — **Chips × Mult → damage**
5. The monster attacks based on its pattern
6. Repeat until the monster dies (reward + shop) or all players die (defeat)
7. 2 floors × 3 rooms each; floor 2 room 3 is the final boss

### Scoring (Balatro-style)

Each hand has **Chips × Multiplier = Damage**. Base values come from the hand type, card ranks add chips, and class abilities + jokers modify the final totals.

### Classes

| Class | Strength | Special |
|---|---|---|
| Fighter | Face card bonus chips; Four of a Kind power | +20 chips per face card in scoring |
| Rogue | Clubs mult per card; Straights hit hard | +1 mult per ♣ scoring card |
| Wizard | Flush multiplier explosion | Flush ×2 mult; Aces +15 chips |
| Cleric | Sustain: hands heal the party | Full House heals 5 HP; Pair heals 2 HP |
| Ranger | Straight specialist; Diamonds add chips | Straight +20 chips +4 mult |
| Bard | Synergy: matches teammates for bonus mult | +2 mult per teammate playing same hand type |

## Testing

```bash
npm run typecheck    # runs tsc --noEmit across all packages
```

No automated tests yet — the game logic in `packages/shared` is pure functions and straightforward to unit test.

## Status

Early prototype. Core loop is playable end-to-end. Missing:
- Card enhancements / seals (Balatro-style upgrades)
- Deck-building between runs
- More monsters, jokers, floors
- Sound + animation
- Mobile layout

## License
 
All rights reserved — see `LICENSE`. This repository is public for transparency and reference. You may read the code but may not copy, modify, distribute, or sell it without permission.
 
---
 
*A mournival of aces beats everything.*
