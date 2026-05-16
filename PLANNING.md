# Mournival — Project Planning

This file tracks feature work, design decisions, and known issues. Update it as things are built or descoped.

---

## Current milestone: Playable prototype

Core loop is complete end-to-end. The goal of this milestone is a stable, shareable prototype that demonstrates the concept.

### Done
- [x] Lobby + room codes
- [x] Class selection (5 classes)
- [x] Combat loop (deal → select → play/discard → result → advance)
- [x] Balatro-style chips × mult scoring engine
- [x] Card enhancements (bonus, mult, glass, steel, gold, wild)
- [x] Jokers (passive modifiers, shop purchasable)
- [x] Consumables: Arcana (16 effects) + Celestial Stones (hand leveling)
- [x] Shop phase with gold economy
- [x] Interest mechanic ($1 per $5 held, max $5, paid on monster death only)
- [x] The Mournival team combo (×4 damage)
- [x] Player death + spectator mode
- [x] Game log
- [x] Live scoring preview in sidebar
- [x] Full unit test suite (235 tests)
- [x] Midnight teal design system
- [x] Slay the Spire-style floor map (15 rows, branching paths, boss at row 15)
- [x] Map node types: combat, elite, shop, rest, boss
- [x] Depth-scaled monster difficulty (row 0 = 1.0×, row 14 = 2.4×)
- [x] Floor 2 monster scaling (2.5× HP, 1.3× attack vs floor 1)
- [x] Difficulty anchored to 30 chips ≈ 4 mult; first monster always 300 HP
- [x] King as distinct rank type; King's Gambit rare joker (×2 mult per scoring King)
- [x] Rebalanced joker pool (14 jokers across common/uncommon/rare/legendary)

---

## Backlog

Items below are roughly priority-ordered within each section. Nothing here is committed — reprioritize freely.

### Content

- [ ] **More monsters** — current roster is thin (3 floor-1, 3 floor-2, 2 bosses); add variety with distinct weaknesses and attack patterns
- [ ] **Boss mechanics** — floor bosses should have unique phase patterns, not just high HP
- [ ] **Legendary jokers gated behind boss kills** — legendary jokers should only be acquirable by defeating a floor boss; they could drop directly or unlock a legendary-only pack in the post-boss shop. Currently legendary jokers can appear in the standard shop with a 1% weight, which undercuts their feeling of being truly earned.
- [ ] **Monster equipment drops** — monsters have a chance to drop loot on death: weapons (passive chip/mult bonus tied to a specific rank), armour (reduces incoming damage), or trinkets (miscellaneous effects). Equipment occupies a dedicated slot separate from jokers. Boss kills guarantee a drop; non-boss kills have a ~30% chance.
- [ ] **Relics — unique run-defining artefacts** — each run, one Relic is chosen at the start (or found on a mid-run event tile). Relics are single-of-a-kind effects that fundamentally alter play: e.g., *The Abacus* (scoring chips also count as gold 1:10), *The Pact* (each player's damage is averaged across the party instead of summed). Relics create the "build identity" that makes each run feel distinct.
- [ ] **More classes** — Bard (team synergy), Paladin (sustain + smite) are natural fits
- [ ] **More arcana effects** — target enhancements, copy cards, transform suits
- [ ] **More jokers** — expand the pool, especially uncommon xMult jokers with specific requirements

### Progression

- [ ] **Persistent runs** — currently each session is stateless; add a run object that persists across floors so deck composition changes matter
- [ ] **Deck building** — buy cards in the shop to improve your deck; remove weak cards; unlock class-specific cards
- [ ] **Starting decks** — class-specific starting decks rather than standard 52-card decks
- [ ] **Seals** — Balatro-style card seals (red seal: retrigger, blue seal: create planet on play, etc.)
- [ ] **Vouchers** — permanent run-wide upgrades purchasable in the shop

### Multiplayer & UX

- [ ] **Reconnection** — socket drops lose the player entirely; implement rejoin by room code + player name
- [ ] **Spectator improvements** — dead players see very little; show teammates' hands (read-only) and scoring
- [ ] **Ready / vote-to-continue** — replace auto-advance with explicit ready-up between rooms
- [ ] **Player indicators on cards** — in the round result overlay, show which cards each player played
- [ ] **Emotes / communication** — quick reactions (thumbs up, "play The Mournival?", etc.) for coordination without voice chat

### Polish

- [ ] **Animations** — card play, damage numbers, monster death, shop purchase
- [ ] **Sound** — hit SFX, hand-type fanfares, shop jingle
- [ ] **Mobile layout** — current layout assumes landscape desktop; needs a stacked mobile view
- [ ] **Accessibility** — suit color-blindness mode; keyboard navigation

### Infrastructure

- [ ] **Persistent server state** — rooms are in-memory; a server restart kills all games
- [ ] **Room expiry** — rooms with no activity should clean up after ~1 hour
- [ ] **Deployment** — no CI/CD or hosting config yet; add Railway/Fly config for server and Vercel/Cloudflare for client
- [ ] **Error boundaries** — client has no error boundary; a bad state update crashes the whole UI

---

## Known bugs

No open bugs.

---

## Design decisions log

Rationale for non-obvious choices made during development.

**Why pure functions in `@mournival/shared`?**
All game state transitions are pure functions `(state, action) → newState`. This makes every operation unit-testable without mocking, and means the server is just an authority layer — the client could theoretically run the same logic locally for prediction.

**Why Zustand over Redux?**
The state shape is simple and the update patterns don't benefit from Redux's tooling overhead. Zustand's `set` directly over the socket event handlers is straightforward and the store doubles as the socket-event dispatcher.

**Why keep scoring preview client-side?**
`evaluateHand` and `scoreHand` are pure and fast. Running them client-side on every selection avoids a round-trip and keeps the preview latency at zero. The server re-runs the same functions authoritatively on play — no desync risk since both sides use the same shared code.

**Hand refill on play/discard, not on consumable use**
Destructive consumables (Skull, Void) remove cards from the hand mid-combat. Refilling immediately would let players cycle cards for free. Instead, the deck fills up to `HAND_SIZE` on the next play or discard, making card destruction a meaningful tradeoff.

**The Mournival trigger condition**
Requiring *all* active players (not all 4 seats) to trigger the combo keeps the mechanic relevant at 2–3 players and scales naturally with party death.

**Interest paid on monster death only**
Interest accrues at the end of every round in many roguelikes, but paying it mid-combat creates a perverse incentive to stall. Deferring interest until the kill keeps gold economy clean: save your gold to earn interest, but you only earn it by fighting efficiently.

**30 chips ≈ 4 mult as the balance anchor**
The scoring engine treats chips and mult as equivalent per unit (both contribute equally to chips × mult at base values). Joker and card enhancement values are calibrated against this: a +30-chip effect (Steel Buckler) is a common-tier bonus, while a ×2 mult effect (Scholar's Tome) is uncommon. xMult jokers with no hand restriction are rare or legendary; per-card xMult (King's Gambit) is rare with a restrictive trigger.

**King as a distinct rank type**
Kings are split from the generic `'face'` rank category so that xMult jokers can target them specifically (King's Gambit: ×2 per scoring King). Fool's Cap (+3 mult per face card) now covers only Jacks and Queens, keeping kings as a high-value but separately payable rank. Aces remain their own category (`'ace'`).

**Row 0 always combat, never elite**
The first available map nodes (row 0) are forced to `'combat'` type. Without this, the 15% random elite chance could spawn a 450-HP monster on the opening encounter, which is unwinnable with a fresh deck and no jokers.
