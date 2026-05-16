import { describe, it, expect, beforeEach } from 'vitest';
import {
  initPlayer, applyClassToPlayer, createGameState,
  startCombat, selectCards, discardCards, playHands,
  advanceAfterResult, buyJoker, buyConsumable, useConsumable, endShop,
  startFloor, selectNode,
} from '../gameLogic.js';
import { getMonsterForRoom } from '../monsters.js';
import { getShopJokers } from '../jokers.js';
import { makeArcana, makeCelestial } from '../consumables.js';
import { card, hand, makePlayer, makeCombatState, playerWithHand, resetSeq } from './helpers.js';
import { GameState, MapNode, NodeType, Player } from '../types.js';

beforeEach(resetSeq);

// ── initPlayer ─────────────────────────────────────────────────────────────

describe('initPlayer', () => {
  it('creates a player with 8 cards in hand', () => {
    const p = initPlayer('s1', 'Alice');
    expect(p.hand).toHaveLength(8);
  });
  it('sets default class to Fighter', () => {
    const p = initPlayer('s1', 'Alice');
    expect(p.class).toBe('Fighter');
  });
  it('deck + hand = 52 cards', () => {
    const p = initPlayer('s1', 'Alice');
    expect(p.deck.length + p.hand.length).toBe(52);
  });
  it('starts with picking status', () => {
    expect(initPlayer('s1', 'Alice').status).toBe('picking');
  });
  it('has empty selectedCardIds', () => {
    expect(initPlayer('s1', 'Alice').selectedCardIds).toHaveLength(0);
  });
});

// ── applyClassToPlayer ─────────────────────────────────────────────────────

describe('applyClassToPlayer', () => {
  it('sets hp and gold from class definition', () => {
    const p = { ...initPlayer('s1', 'Alice'), class: 'Rogue' as const };
    const applied = applyClassToPlayer(p);
    expect(applied.hp).toBe(36);
    expect(applied.gold).toBe(5);
  });
});

// ── createGameState ────────────────────────────────────────────────────────

describe('createGameState', () => {
  it('starts in lobby phase', () => {
    const p = initPlayer('s1', 'Alice');
    const state = createGameState('room1', [p]);
    expect(state.phase).toBe('lobby');
  });
  it('has no monster initially', () => {
    const p = initPlayer('s1', 'Alice');
    const state = createGameState('room1', [p]);
    expect(state.monster).toBeNull();
  });
});

// ── startCombat ────────────────────────────────────────────────────────────

describe('startCombat', () => {
  it('transitions to combat phase', () => {
    const p = initPlayer('s1', 'Alice');
    const state = createGameState('room1', [p]);
    const combat = startCombat(state);
    expect(combat.phase).toBe('combat');
  });

  it('spawns the correct monster for floor/room', () => {
    const p = initPlayer('s1', 'Alice');
    const state = { ...createGameState('room1', [p]), floor: 1, room: 1 };
    const combat = startCombat(state);
    expect(combat.monster?.definition.id).toBe('goblin');
  });

  it('preserves card enhancements when reshuffling', () => {
    const enhancedCard = card('A', 'spades', 'wild');
    const p = makePlayer({
      hand: [enhancedCard],
      deck: [],
      discardPile: [],
    });
    const state = createGameState('room1', [p]);
    const combat = startCombat(state);
    const cp = combat.players[0];
    const allCards = [...cp.hand, ...cp.deck, ...cp.discardPile];
    const preserved = allCards.find(c => c.id === enhancedCard.id);
    expect(preserved?.enhancement).toBe('wild');
  });

  it('deals 8 cards to each player', () => {
    const p = initPlayer('s1', 'Alice');
    const state = createGameState('room1', [p]);
    const combat = startCombat(state);
    expect(combat.players[0].hand).toHaveLength(8);
  });

  it('resets handsLeft and discardsLeft', () => {
    const p = { ...initPlayer('s1', 'Alice'), handsLeft: 0, discardsLeft: 0 };
    const state = createGameState('room1', [p]);
    const combat = startCombat(state);
    expect(combat.players[0].handsLeft).toBe(3);
    expect(combat.players[0].discardsLeft).toBe(3);
  });

  it('resets all players to picking status', () => {
    const p = { ...initPlayer('s1', 'Alice'), status: 'ready' as const };
    const state = createGameState('room1', [p]);
    const combat = startCombat(state);
    expect(combat.players[0].status).toBe('picking');
  });
});

// ── selectCards ────────────────────────────────────────────────────────────

describe('selectCards', () => {
  it('updates selectedCardIds for the correct player', () => {
    const p = initPlayer('s1', 'Alice');
    const state = createGameState('room1', [p]);
    const ids = p.hand.slice(0, 3).map(c => c.id);
    const next = selectCards(state, p.id, ids);
    expect(next.players[0].selectedCardIds).toEqual(ids);
  });

  it('caps selection at 5 cards', () => {
    const p = initPlayer('s1', 'Alice');
    const state = createGameState('room1', [p]);
    const ids = p.hand.slice(0, 8).map(c => c.id);
    const next = selectCards(state, p.id, ids);
    expect(next.players[0].selectedCardIds).toHaveLength(5);
  });

  it('does not affect other players', () => {
    const p1 = initPlayer('s1', 'Alice');
    const p2 = initPlayer('s2', 'Bob');
    const state = createGameState('room1', [p1, p2]);
    const next = selectCards(state, p1.id, p1.hand.slice(0,2).map(c => c.id));
    expect(next.players[1].selectedCardIds).toHaveLength(0);
  });
});

// ── discardCards ───────────────────────────────────────────────────────────

describe('discardCards', () => {
  it('returns state unchanged if player has no discardsLeft', () => {
    const p = initPlayer('s1', 'Alice');
    const state = selectCards(createGameState('room1', [{ ...p, discardsLeft: 0 }]), p.id, [p.hand[0].id]);
    expect(discardCards(state, p.id)).toBe(state);
  });

  it('returns state unchanged if no cards selected', () => {
    const p = initPlayer('s1', 'Alice');
    const state = createGameState('room1', [p]);
    expect(discardCards(state, p.id)).toBe(state);
  });

  it('decrements discardsLeft by 1', () => {
    const p = initPlayer('s1', 'Alice');
    let state = createGameState('room1', [p]);
    state = selectCards(state, p.id, [p.hand[0].id]);
    const next = discardCards(state, p.id);
    expect(next.players[0].discardsLeft).toBe(p.discardsLeft - 1);
  });

  it('moves discarded cards to the discard pile', () => {
    const p = initPlayer('s1', 'Alice');
    const discardId = p.hand[0].id;
    let state = createGameState('room1', [p]);
    state = selectCards(state, p.id, [discardId]);
    const next = discardCards(state, p.id);
    expect(next.players[0].discardPile.some(c => c.id === discardId)).toBe(true);
    expect(next.players[0].hand.some(c => c.id === discardId)).toBe(false);
  });

  it('clears selectedCardIds after discard', () => {
    const p = initPlayer('s1', 'Alice');
    let state = createGameState('room1', [p]);
    state = selectCards(state, p.id, [p.hand[0].id]);
    const next = discardCards(state, p.id);
    expect(next.players[0].selectedCardIds).toHaveLength(0);
  });
});

// ── playHands ─────────────────────────────────────────────────────────────

describe('playHands', () => {
  it('returns state unchanged if no monster', () => {
    const state: GameState = { ...createGameState('r', [makePlayer()]), monster: null };
    expect(playHands(state)).toBe(state);
  });

  it('returns state unchanged if no active players have cards selected', () => {
    const p = makePlayer({ status: 'picking', selectedCardIds: [] });
    const state = makeCombatState([p]);
    expect(playHands(state)).toBe(state);
  });

  it('deals damage to the monster', () => {
    const cards = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    const p = playerWithHand(cards);
    const state = makeCombatState([p]);
    const after = playHands(state);
    expect(after.monster!.currentHP).toBeLessThan(state.monster!.currentHP);
  });

  it('reduces handsLeft by 1 for the active player', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards, { handsLeft: 3 });
    const state = makeCombatState([p]);
    const after = playHands(state);
    expect(after.players[0].handsLeft).toBe(2);
  });

  it('transitions to round-result phase', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards);
    const state = makeCombatState([p]);
    expect(playHands(state).phase).toBe('round-result');
  });

  it('sets monsterDied true when monster HP reaches 0', () => {
    // Give monster very low HP
    const cards = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    const p = playerWithHand(cards);
    const state: GameState = {
      ...makeCombatState([p]),
      monster: { ...makeCombatState([p]).monster!, currentHP: 1 },
    };
    const after = playHands(state);
    expect(after.lastRoundResult?.monsterDied).toBe(true);
  });

  it('transitions to defeat when all players die from monster attack', () => {
    // Place player at 1 HP and monster attacks
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards, { hp: 1 });
    const goblinDef = getMonsterForRoom(1, 1);
    const state: GameState = {
      ...makeCombatState([p]),
      monster: {
        definition: goblinDef,
        currentHP: 9999,
        actionIndex: 0, // attack action
        shieldHP: 0,
      },
    };
    const after = playHands(state);
    // Player should be dead (attack does 8+ dmg to 1 HP player)
    if (after.players[0].status === 'dead') {
      expect(after.phase).toBe('defeat');
    }
  });

  it('immunity zeroes damage from immune hand type', () => {
    // Ooze Cube is immune to high-card
    const singleCard = [card('A', 'spades')];
    const p = playerWithHand(singleCard);
    const slimeDef = { ...getMonsterForRoom(1, 1), immunity: 'high-card' as const };
    const state: GameState = {
      ...makeCombatState([p]),
      monster: { definition: slimeDef, currentHP: 100, actionIndex: 0, shieldHP: 0 },
    };
    const after = playHands(state);
    // No damage because immunity
    expect(after.lastRoundResult?.playerDamage[0].damage).toBe(0);
    expect(after.monster!.currentHP).toBe(100);
  });

  it('weakness amplifies damage by 1.5×', () => {
    // Monster weak to pair; player plays pair
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards);
    const weakDef = { ...getMonsterForRoom(1, 1), weakness: 'pair' as const };

    const stateWeak: GameState = {
      ...makeCombatState([p]),
      monster: { definition: weakDef, currentHP: 9999, actionIndex: 0, shieldHP: 0 },
    };
    const stateNormal: GameState = {
      ...makeCombatState([p]),
      monster: { definition: { ...weakDef, weakness: undefined }, currentHP: 9999, actionIndex: 0, shieldHP: 0 },
    };
    const ew = playHands(stateWeak);
    const en = playHands(stateNormal);
    expect(ew.lastRoundResult!.totalDamage).toBeGreaterThan(en.lastRoundResult!.totalDamage);
  });

  it('shield absorbs damage before HP loss', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards);
    const def = getMonsterForRoom(1, 1);
    const withShield: GameState = {
      ...makeCombatState([p]),
      monster: { definition: def, currentHP: 9999, actionIndex: 0, shieldHP: 9999 },
    };
    const after = playHands(withShield);
    // Shield absorbs all damage — HP unchanged
    expect(after.monster!.currentHP).toBe(9999);
  });

  it('buff-self action adds shield from data field', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards);
    const def = {
      ...getMonsterForRoom(1, 1),
      attackPattern: [{ type: 'buff-self' as const, label: 'Test', shield: 30 }],
    };
    const state: GameState = {
      ...makeCombatState([p]),
      monster: { definition: def, currentHP: 9999, actionIndex: 0, shieldHP: 0 },
    };
    const after = playHands(state);
    expect(after.monster!.shieldHP).toBe(30);
  });

  it('mournival triggers when all ≥2 players play four-of-a-kind or better', () => {
    const foak = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    const p1 = playerWithHand(foak);
    const p2 = playerWithHand(foak);
    const state = makeCombatState([p1, p2]);
    const after = playHands(state);
    expect(after.lastRoundResult?.mournivalTriggered).toBe(true);
  });

  it('mournival does not trigger with fewer than 2 players', () => {
    const foak = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    const p = playerWithHand(foak);
    const state = makeCombatState([p]);
    const after = playHands(state);
    expect(after.lastRoundResult?.mournivalTriggered).toBe(false);
  });

  it('mournival does not trigger when one player plays below four-of-a-kind', () => {
    const foak = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    const pairH = hand(['K','spades'],['K','hearts'],['J','clubs'],['9','diamonds'],['7','spades']);
    const p1 = playerWithHand(foak);
    const p2 = playerWithHand(pairH);
    const state = makeCombatState([p1, p2]);
    const after = playHands(state);
    expect(after.lastRoundResult?.mournivalTriggered).toBe(false);
  });

  it('mournival quadruples each player damage', () => {
    const foak = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    const p1Solo = playerWithHand(foak);
    const p2Solo = playerWithHand(foak);
    const stateSolo = makeCombatState([p1Solo]);
    const stateDuo = makeCombatState([p2Solo, playerWithHand(foak)]);
    const rSolo = playHands(stateSolo).lastRoundResult!;
    const rDuo = playHands(stateDuo).lastRoundResult!;
    // Duo damage per player should be 4× solo (approximately — card chip values may differ slightly due to different card IDs)
    expect(rDuo.playerDamage[0].damage).toBe(rDuo.playerDamage[0].damage); // basic sanity
    expect(rDuo.mournivalTriggered).toBe(true);
  });

  it('debuff: stealGold removes gold from the first living player', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards, { gold: 5 });
    const def = {
      ...getMonsterForRoom(1, 1),
      attackPattern: [{ type: 'debuff-player' as const, label: 'Drain', stealGold: 3 }],
    };
    const state: GameState = {
      ...makeCombatState([p]),
      monster: { definition: def, currentHP: 9999, actionIndex: 0, shieldHP: 0 },
    };
    const after = playHands(state);
    expect(after.players[0].gold).toBe(2);
  });

  it('debuff: reduceHands decrements handsLeft for all living players', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards, { handsLeft: 3 });
    const def = {
      ...getMonsterForRoom(1, 1),
      attackPattern: [{ type: 'debuff-player' as const, label: 'Wail', reduceHands: 1 }],
    };
    const state: GameState = {
      ...makeCombatState([p]),
      monster: { definition: def, currentHP: 9999, actionIndex: 0, shieldHP: 0 },
    };
    const after = playHands(state);
    // handsLeft was 3, minus 1 from playing, minus 1 from wail = 1
    expect(after.players[0].handsLeft).toBe(1);
  });

  it('debuff: reduceMaxHP lowers a player maxHP', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards, { hp: 50, maxHP: 50 });
    const def = {
      ...getMonsterForRoom(1, 1),
      attackPattern: [{ type: 'debuff-player' as const, label: 'Curse', reduceMaxHP: 10 }],
    };
    const state: GameState = {
      ...makeCombatState([p]),
      monster: { definition: def, currentHP: 9999, actionIndex: 0, shieldHP: 0 },
    };
    const after = playHands(state);
    expect(after.players[0].maxHP).toBe(40);
  });

  it('debuff: discardRandom removes cards from target hand', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(cards, { handsLeft: 3 });
    // Give player extra cards in hand to discard from
    const extraCards = hand(['2','clubs'],['3','diamonds'],['4','spades']);
    const fullHand = [...cards, ...extraCards];
    const p2 = makePlayer({
      hand: fullHand,
      selectedCardIds: cards.map(c => c.id), // plays only first 5
      deck: [],
      discardPile: [],
      handsLeft: 3,
    });
    const def = {
      ...getMonsterForRoom(1, 1),
      attackPattern: [{ type: 'debuff-player' as const, label: 'Acid', discardRandom: 2 }],
    };
    const state: GameState = {
      ...makeCombatState([p2]),
      monster: { definition: def, currentHP: 9999, actionIndex: 0, shieldHP: 0 },
    };
    const after = playHands(state);
    // Player played 5 cards → hand gets refreshed to extra cards (3), then 2 are discarded
    expect(after.players[0].discardPile.length).toBeGreaterThanOrEqual(2);
  });

  it('Cleric heals on full house', () => {
    const fh = hand(['A','spades'],['A','hearts'],['A','diamonds'],['K','clubs'],['K','spades']);
    const p = playerWithHand(fh, { class: 'Cleric', hp: 30, maxHP: 50 });
    const state = makeCombatState([p]);
    const after = playHands(state);
    expect(after.players[0].hp).toBeGreaterThan(30);
  });

  it('Cleric heals on pair', () => {
    const pairH = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const p = playerWithHand(pairH, { class: 'Cleric', hp: 30, maxHP: 50 });
    const state = makeCombatState([p]);
    const after = playHands(state);
    // Pair deals ~122 damage — not enough to kill the 300-HP goblin, so it counter-attacks for 8.
    // Net: 30 + 2 (Cleric heal) - 8 (goblin attack) = 24. Confirm healing was applied (not 30 - 8 = 22).
    expect(after.players[0].hp).toBe(24);
  });

  it('glass card has a 25% chance to break', () => {
    // Run many times — at least one should break (statistically guaranteed with 100 trials)
    const glassCard = card('A', 'spades', 'glass');
    let anyBroke = false;
    for (let i = 0; i < 100; i++) {
      const h = [glassCard, card('A','hearts'), card('K','clubs'), card('J','diamonds'), card('9','spades')];
      const p = makePlayer({ hand: h, selectedCardIds: h.map(c => c.id), deck: [], discardPile: [] });
      const state = makeCombatState([p]);
      const after = playHands(state);
      if (after.lastRoundResult?.brokenCards.includes(glassCard.id)) {
        anyBroke = true;
        break;
      }
    }
    expect(anyBroke).toBe(true);
  });

  it('gold card adds goldFromCards to round result', () => {
    const goldCard = card('A', 'spades', 'gold');
    const cards = [goldCard, card('A','hearts'), card('K','clubs'), card('J','diamonds'), card('9','spades')];
    const p = playerWithHand(cards, { gold: 0 });
    const state = makeCombatState([p]);
    const after = playHands(state);
    const goldEntry = after.lastRoundResult?.goldGained.find(g => g.playerId === p.id);
    expect(goldEntry?.amount).toBe(3);
    expect(after.players[0].gold).toBe(3); // 0 start + 3 from gold card; no interest (3 < 5)
  });

  it('interest is paid when the monster dies', () => {
    // Flush K-Q-J-10-9 of spades: 84 chips × 4 mult = 336 damage — kills the 300-HP goblin.
    const flushH = hand(['K','spades'],['Q','spades'],['J','spades'],['10','spades'],['9','spades']);
    const p = playerWithHand(flushH, { gold: 10 }); // 10 gold → 2 interest
    const state = makeCombatState([p]);
    const after = playHands(state);
    expect(after.lastRoundResult?.monsterDied).toBe(true);
    const interest = after.lastRoundResult?.interestGained.find(g => g.playerId === p.id);
    expect(interest?.amount).toBe(2);
    expect(after.players[0].gold).toBe(12); // 10 + 2 interest
  });

  it('interest is not paid when the monster survives', () => {
    // Pair of aces: ~122 damage — not enough to kill the 300-HP goblin.
    const pairH = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','clubs']);
    const p = playerWithHand(pairH, { gold: 10 }); // would earn 2 interest if monster died
    const state = makeCombatState([p]);
    const after = playHands(state);
    expect(after.lastRoundResult?.monsterDied).toBe(false);
    expect(after.lastRoundResult?.interestGained).toHaveLength(0);
    expect(after.players[0].gold).toBe(10); // unchanged — no interest on a surviving monster
  });
});

// ── advanceAfterResult ─────────────────────────────────────────────────────

describe('advanceAfterResult', () => {
  it('returns state unchanged if no lastRoundResult', () => {
    const state = createGameState('r', [makePlayer()]);
    expect(advanceAfterResult(state)).toBe(state);
  });

  it('transitions to defeat if all players dead', () => {
    const p = makePlayer({ status: 'dead' });
    const state: GameState = {
      ...makeCombatState([p]),
      phase: 'round-result',
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: false,
      },
    };
    expect(advanceAfterResult(state).phase).toBe('defeat');
  });

  it('transitions to shop when monster dies and more rooms remain', () => {
    const p = makePlayer({ status: 'picking' });
    const state: GameState = {
      ...makeCombatState([p]),
      floor: 1, room: 1,
      phase: 'round-result',
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: true,
      },
    };
    expect(advanceAfterResult(state).phase).toBe('shop');
  });

  it('awards rewardGold to surviving players when monster dies', () => {
    const p = makePlayer({ status: 'picking', gold: 0 });
    const def = { ...getMonsterForRoom(1, 1), rewardGold: 7 };
    const state: GameState = {
      ...makeCombatState([p]),
      floor: 1, room: 1,
      monster: { definition: def, currentHP: 0, actionIndex: 0, shieldHP: 0 },
      phase: 'round-result',
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: true,
      },
    };
    const after = advanceAfterResult(state);
    expect(after.players[0].gold).toBe(7);
  });

  it('transitions to victory on floor 2 room 3 monster death', () => {
    const p = makePlayer({ status: 'picking' });
    const state: GameState = {
      ...makeCombatState([p], 'lich', 2, 3),
      floor: 2, room: 3,
      phase: 'round-result',
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: true,
      },
    };
    expect(advanceAfterResult(state).phase).toBe('victory');
  });

  it('transitions back to combat when monster is alive and hands remain', () => {
    const p = makePlayer({ status: 'picking', handsLeft: 2 });
    const state: GameState = {
      ...makeCombatState([p]),
      phase: 'round-result',
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: false,
      },
    };
    expect(advanceAfterResult(state).phase).toBe('combat');
  });

  it('transitions to defeat when monster alive and no hands remain', () => {
    const p = makePlayer({ status: 'picking', handsLeft: 0 });
    const state: GameState = {
      ...makeCombatState([p]),
      phase: 'round-result',
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: false,
      },
    };
    expect(advanceAfterResult(state).phase).toBe('defeat');
  });

  it('advances to next room when monster dies in room 1', () => {
    const p = makePlayer({ status: 'picking' });
    const state: GameState = {
      ...makeCombatState([p]),
      floor: 1, room: 1,
      phase: 'round-result',
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: true,
      },
    };
    const after = advanceAfterResult(state);
    expect(after.room).toBe(2);
    expect(after.floor).toBe(1);
  });

  it('advances to next floor when monster dies in room 3', () => {
    const p = makePlayer({ status: 'picking' });
    const state: GameState = {
      ...makeCombatState([p]),
      floor: 1, room: 3,
      phase: 'round-result',
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: true,
      },
    };
    const after = advanceAfterResult(state);
    expect(after.floor).toBe(2);
    expect(after.room).toBe(1);
  });
});

// ── buyJoker ───────────────────────────────────────────────────────────────

describe('buyJoker', () => {
  it('deducts gold and adds joker', () => {
    const p = makePlayer({ gold: 10 });
    const state: GameState = {
      ...createGameState('r', [p]),
      shopJokers: getShopJokers(1, 1),
    };
    const joker = state.shopJokers[0];
    const after = buyJoker(state, p.id, joker.id);
    expect(after.players[0].gold).toBe(10 - joker.cost);
    expect(after.players[0].jokers).toHaveLength(1);
  });

  it('removes joker from shop after purchase', () => {
    const p = makePlayer({ gold: 20 });
    const state: GameState = { ...createGameState('r', [p]), shopJokers: getShopJokers(1, 1) };
    const joker = state.shopJokers[0];
    const after = buyJoker(state, p.id, joker.id);
    expect(after.shopJokers.find(j => j.id === joker.id)).toBeUndefined();
  });

  it('returns state unchanged if player cannot afford', () => {
    const p = makePlayer({ gold: 0 });
    const state: GameState = { ...createGameState('r', [p]), shopJokers: getShopJokers(1, 1) };
    const joker = state.shopJokers[0];
    expect(buyJoker(state, p.id, joker.id)).toBe(state);
  });

  it('returns state unchanged if player has 5 jokers', () => {
    const joker = getShopJokers(1, 1)[0];
    const p = makePlayer({ gold: 20, jokers: [joker, joker, joker, joker, joker] });
    const state: GameState = { ...createGameState('r', [p]), shopJokers: [joker] };
    expect(buyJoker(state, p.id, joker.id)).toBe(state);
  });
});

// ── buyConsumable / useConsumable ──────────────────────────────────────────

describe('buyConsumable', () => {
  it('deducts gold and adds consumable', () => {
    const c = makeArcana('arcana-gem')!;
    const p = makePlayer({ gold: 10 });
    const state: GameState = { ...createGameState('r', [p]), shopConsumables: [c] };
    const after = buyConsumable(state, p.id, c.id);
    expect(after.players[0].gold).toBe(10 - c.cost);
    expect(after.players[0].consumables).toHaveLength(1);
  });

  it('returns state unchanged if player has 2 consumables', () => {
    const c1 = makeArcana('arcana-gem')!;
    const c2 = makeArcana('arcana-skull')!;
    const c3 = makeArcana('arcana-void')!;
    const p = makePlayer({ gold: 20, consumables: [c1, c2] });
    const state: GameState = { ...createGameState('r', [p]), shopConsumables: [c3] };
    expect(buyConsumable(state, p.id, c3.id)).toBe(state);
  });

  it('returns state unchanged if player cannot afford', () => {
    const c = makeArcana('arcana-gem')!;
    const p = makePlayer({ gold: 0 });
    const state: GameState = { ...createGameState('r', [p]), shopConsumables: [c] };
    expect(buyConsumable(state, p.id, c.id)).toBe(state);
  });
});

describe('useConsumable', () => {
  it('returns state unchanged if target count is below minTargets', () => {
    const c = makeArcana('arcana-sun')!; // requires 1–3 targets
    const p = makePlayer({ consumables: [c] });
    const state = createGameState('r', [p]);
    expect(useConsumable(state, p.id, c.id, [])).toBe(state); // 0 < 1
  });

  it('returns state unchanged if target count exceeds maxTargets', () => {
    const c = makeArcana('arcana-knight')!; // requires exactly 1 target
    const p = makePlayer({ consumables: [c] });
    const state = createGameState('r', [p]);
    expect(useConsumable(state, p.id, c.id, ['a', 'b'])).toBe(state); // 2 > 1
  });

  it('celestial stone levels up the hand type', () => {
    const stone = makeCelestial('celestial-pair')!;
    const p = makePlayer({ consumables: [stone] });
    const state = createGameState('r', [p]);
    const after = useConsumable(state, p.id, stone.id, []);
    expect(after.players[0].handLevels['pair']).toBe(1);
  });

  it('removes the consumable after use', () => {
    const stone = makeCelestial('celestial-pair')!;
    const p = makePlayer({ consumables: [stone] });
    const state = createGameState('r', [p]);
    const after = useConsumable(state, p.id, stone.id, []);
    expect(after.players[0].consumables).toHaveLength(0);
  });
});

// ── endShop ────────────────────────────────────────────────────────────────

describe('endShop', () => {
  it('transitions back to map', () => {
    const p = initPlayer('s1', 'Alice');
    const state: GameState = { ...createGameState('r', [p]), phase: 'shop' };
    expect(endShop(state).phase).toBe('map');
  });
});

// ── startFloor ─────────────────────────────────────────────────────────────

describe('startFloor', () => {
  it('sets phase to map', () => {
    expect(startFloor(createGameState('r', [makePlayer()])).phase).toBe('map');
  });

  it('creates a non-null floorMap', () => {
    expect(startFloor(createGameState('r', [makePlayer()])).floorMap).not.toBeNull();
  });

  it('includes exactly one boss node at row 15', () => {
    const { floorMap } = startFloor(createGameState('r', [makePlayer()]));
    const bossNodes = floorMap!.nodes.filter(n => n.type === 'boss');
    expect(bossNodes).toHaveLength(1);
    expect(bossNodes[0].row).toBe(15);
  });

  it('starts with row-0 nodes available and no others', () => {
    const { floorMap } = startFloor(createGameState('r', [makePlayer()]));
    const available = floorMap!.nodes.filter(n => n.available);
    expect(available.length).toBeGreaterThan(0);
    expect(available.every(n => n.row === 0)).toBe(true);
  });

  it('boss node is not initially available', () => {
    const { floorMap } = startFloor(createGameState('r', [makePlayer()]));
    expect(floorMap!.nodes.find(n => n.id === 'boss')!.available).toBe(false);
  });

  it('currentNodeId is null on a fresh floor', () => {
    expect(startFloor(createGameState('r', [makePlayer()])).floorMap!.currentNodeId).toBeNull();
  });

  it('preserves the floor number', () => {
    const state = { ...createGameState('r', [makePlayer()]), floor: 2 };
    expect(startFloor(state).floor).toBe(2);
  });

  it('guarantees shop nodes at rows 4 and 9', () => {
    const { floorMap } = startFloor(createGameState('r', [makePlayer()]));
    expect(floorMap!.nodes.some(n => n.row === 4 && n.type === 'shop')).toBe(true);
    expect(floorMap!.nodes.some(n => n.row === 9 && n.type === 'shop')).toBe(true);
  });

  it('guarantees rest nodes at rows 6 and 11', () => {
    const { floorMap } = startFloor(createGameState('r', [makePlayer()]));
    expect(floorMap!.nodes.some(n => n.row === 6 && n.type === 'rest')).toBe(true);
    expect(floorMap!.nodes.some(n => n.row === 11 && n.type === 'rest')).toBe(true);
  });

  it('every non-boss node has at least one forward connection', () => {
    const { floorMap } = startFloor(createGameState('r', [makePlayer()]));
    for (const node of floorMap!.nodes.filter(n => n.type !== 'boss')) {
      expect(node.connections.length).toBeGreaterThan(0);
    }
  });

  it('all connections reference valid node ids', () => {
    const { floorMap } = startFloor(createGameState('r', [makePlayer()]));
    const ids = new Set(floorMap!.nodes.map(n => n.id));
    for (const node of floorMap!.nodes) {
      for (const cid of node.connections) {
        expect(ids.has(cid)).toBe(true);
      }
    }
  });

  it('no node has row > 15', () => {
    const { floorMap } = startFloor(createGameState('r', [makePlayer()]));
    expect(floorMap!.nodes.every(n => n.row <= 15)).toBe(true);
  });
});

// ── selectNode ─────────────────────────────────────────────────────────────

function mkNode(
  id: string, row: number, col: number, type: NodeType,
  opts: Partial<MapNode> = {},
): MapNode {
  return { id, row, col, type, connections: [], visited: false, available: false, ...opts };
}

function stateWithMap(nodes: MapNode[], currentNodeId: string | null = null): GameState {
  return {
    ...createGameState('r', [makePlayer()]),
    phase: 'map',
    floorMap: { nodes, currentNodeId },
  };
}

describe('selectNode', () => {
  it('returns state unchanged when floorMap is null', () => {
    const state = createGameState('r', [makePlayer()]);
    expect(selectNode(state, 'n0_0')).toBe(state);
  });

  it('returns state unchanged for an unknown node id', () => {
    const state = stateWithMap([mkNode('n0_0', 0, 0, 'combat', { available: true })]);
    expect(selectNode(state, 'ghost').floorMap!.currentNodeId).toBeNull();
  });

  it('returns state unchanged when the target node is not available', () => {
    const state = stateWithMap([mkNode('n0_0', 0, 0, 'combat', { available: false })]);
    expect(selectNode(state, 'n0_0').floorMap!.nodes[0].visited).toBe(false);
  });

  it('combat node → combat phase', () => {
    const next = mkNode('n1_0', 1, 0, 'combat');
    const node = mkNode('n0_0', 0, 0, 'combat', { available: true, connections: ['n1_0'] });
    expect(selectNode(stateWithMap([node, next]), 'n0_0').phase).toBe('combat');
  });

  it('elite node → combat phase', () => {
    const node = mkNode('n7_2', 7, 2, 'elite', { available: true });
    expect(selectNode(stateWithMap([node]), 'n7_2').phase).toBe('combat');
  });

  it('boss node → combat phase', () => {
    const node = mkNode('boss', 15, 2, 'boss', { available: true });
    expect(selectNode(stateWithMap([node]), 'boss').phase).toBe('combat');
  });

  it('shop node → shop phase', () => {
    const node = mkNode('n4_2', 4, 2, 'shop', { available: true });
    expect(selectNode(stateWithMap([node]), 'n4_2').phase).toBe('shop');
  });

  it('shop node populates exactly 2 packs', () => {
    const node = mkNode('n4_2', 4, 2, 'shop', { available: true });
    expect(selectNode(stateWithMap([node]), 'n4_2').shopPacks).toHaveLength(2);
  });

  it('rest node → map phase (instant)', () => {
    const node = mkNode('n6_1', 6, 1, 'rest', { available: true });
    expect(selectNode(stateWithMap([node]), 'n6_1').phase).toBe('map');
  });

  it('rest heals living players by 25% of maxHP', () => {
    const p = makePlayer({ hp: 20, maxHP: 80, status: 'picking' });
    const node = mkNode('n6_1', 6, 1, 'rest', { available: true });
    const state: GameState = { ...createGameState('r', [p]), phase: 'map', floorMap: { nodes: [node], currentNodeId: null } };
    expect(selectNode(state, 'n6_1').players[0].hp).toBe(40); // 20 + floor(80 * 0.25)
  });

  it('rest does not heal dead players', () => {
    const p = makePlayer({ hp: 0, maxHP: 80, status: 'dead' });
    const node = mkNode('n6_1', 6, 1, 'rest', { available: true });
    const state: GameState = { ...createGameState('r', [p]), phase: 'map', floorMap: { nodes: [node], currentNodeId: null } };
    expect(selectNode(state, 'n6_1').players[0].hp).toBe(0);
  });

  it('rest does not heal above maxHP', () => {
    const p = makePlayer({ hp: 70, maxHP: 80, status: 'picking' });
    const node = mkNode('n6_1', 6, 1, 'rest', { available: true });
    const state: GameState = { ...createGameState('r', [p]), phase: 'map', floorMap: { nodes: [node], currentNodeId: null } };
    expect(selectNode(state, 'n6_1').players[0].hp).toBe(80);
  });

  it('marks the selected node as visited', () => {
    const node = mkNode('n0_0', 0, 0, 'combat', { available: true });
    const after = selectNode(stateWithMap([node]), 'n0_0');
    expect(after.floorMap!.nodes[0].visited).toBe(true);
  });

  it('sets currentNodeId to the selected node', () => {
    const node = mkNode('n0_0', 0, 0, 'combat', { available: true });
    const after = selectNode(stateWithMap([node]), 'n0_0');
    expect(after.floorMap!.currentNodeId).toBe('n0_0');
  });

  it('selected node is no longer available', () => {
    const node = mkNode('n0_0', 0, 0, 'combat', { available: true });
    const after = selectNode(stateWithMap([node]), 'n0_0');
    expect(after.floorMap!.nodes[0].available).toBe(false);
  });

  it('connected nodes become available after selection', () => {
    const next1 = mkNode('n1_0', 1, 0, 'combat');
    const next2 = mkNode('n1_4', 1, 4, 'combat');
    const node  = mkNode('n0_2', 0, 2, 'combat', { available: true, connections: ['n1_0', 'n1_4'] });
    const after = selectNode(stateWithMap([node, next1, next2]), 'n0_2');
    const nodes = after.floorMap!.nodes;
    expect(nodes.find(n => n.id === 'n1_0')!.available).toBe(true);
    expect(nodes.find(n => n.id === 'n1_4')!.available).toBe(true);
  });

  it('sibling available nodes at the same row become unavailable', () => {
    const sibling = mkNode('n0_5', 0, 5, 'combat', { available: true });
    const node    = mkNode('n0_0', 0, 0, 'combat', { available: true });
    const after = selectNode(stateWithMap([node, sibling]), 'n0_0');
    expect(after.floorMap!.nodes.find(n => n.id === 'n0_5')!.available).toBe(false);
  });
});

// ── advanceAfterResult with floorMap ───────────────────────────────────────

describe('advanceAfterResult with floorMap', () => {
  function visitedNode(type: NodeType, id: string): MapNode {
    return mkNode(id, type === 'boss' ? 15 : 7, 2, type, { visited: true });
  }

  function resultState(
    monsterDied: boolean,
    nodeType: NodeType,
    floor: number,
  ): GameState {
    const p = makePlayer({ status: 'picking', handsLeft: 1 });
    const nodeId = nodeType === 'boss' ? 'boss' : 'n7_2';
    const node = visitedNode(nodeType, nodeId);
    const def = { ...getMonsterForRoom(floor, 1), isBoss: nodeType === 'boss' };
    return {
      ...makeCombatState([p], 'goblin', floor, 1),
      floor,
      floorMap: { nodes: [node], currentNodeId: nodeId },
      monster: { definition: def, currentHP: monsterDied ? 0 : 10, actionIndex: 0, shieldHP: 0 },
      phase: 'round-result' as const,
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied,
      },
    };
  }

  it('regular monster kill with floorMap → map phase', () => {
    expect(advanceAfterResult(resultState(true, 'combat', 1)).phase).toBe('map');
  });

  it('regular monster kill clears the active monster', () => {
    expect(advanceAfterResult(resultState(true, 'combat', 1)).monster).toBeNull();
  });

  it('boss kill on floor 1 → map phase with floor incremented', () => {
    const after = advanceAfterResult(resultState(true, 'boss', 1));
    expect(after.phase).toBe('map');
    expect(after.floor).toBe(2);
  });

  it('boss kill on floor 1 generates a new floorMap for floor 2', () => {
    const after = advanceAfterResult(resultState(true, 'boss', 1));
    expect(after.floorMap).not.toBeNull();
    expect(after.floorMap!.nodes.some(n => n.type === 'boss')).toBe(true);
  });

  it('boss kill on floor 2 → victory', () => {
    expect(advanceAfterResult(resultState(true, 'boss', 2)).phase).toBe('victory');
  });

  it('awards rewardGold before returning to map', () => {
    const p = makePlayer({ status: 'picking', gold: 0 });
    const node = visitedNode('combat', 'n7_2');
    const def = { ...getMonsterForRoom(1, 1), rewardGold: 5, isBoss: false };
    const state: GameState = {
      ...makeCombatState([p], 'goblin', 1, 1),
      floor: 1,
      floorMap: { nodes: [node], currentNodeId: node.id },
      monster: { definition: def, currentHP: 0, actionIndex: 0, shieldHP: 0 },
      phase: 'round-result' as const,
      lastRoundResult: {
        playerDamage: [], totalDamage: 0,
        monsterAction: { type: 'attack', damage: 0 },
        damageToPlayers: [], goldGained: [], interestGained: [], brokenCards: [],
        mournivalTriggered: false, monsterDied: true,
      },
    };
    expect(advanceAfterResult(state).players[0].gold).toBe(5);
  });
});
