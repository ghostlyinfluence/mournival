import { AttackAction, GameState, MonsterState, Player } from './types.js';
import { CLASS_DEFINITIONS } from './classes.js';
import { createDeck, dealCards, shuffleDeck } from './cards.js';
import { evaluateHand } from './hands.js';
import { scoreHand } from './scoring.js';
import { getMonsterForRoom } from './monsters.js';
import { getShopJokers } from './jokers.js';

const HAND_SIZE = 8;
const HANDS_PER_ROOM = 3;
const DISCARDS_PER_ROOM = 3;

export function initPlayer(id: string, name: string): Player {
  const deck = shuffleDeck(createDeck(`${id}`));
  const { dealt: hand, remaining: remaining } = dealCards(deck, HAND_SIZE);
  return {
    id,
    name,
    class: 'Fighter',
    hp: 50,
    maxHP: 50,
    gold: 3,
    deck: remaining,
    hand,
    discardPile: [],
    selectedCardIds: [],
    jokers: [],
    handsLeft: HANDS_PER_ROOM,
    discardsLeft: DISCARDS_PER_ROOM,
    status: 'picking',
  };
}

export function applyClassToPlayer(player: Player): Player {
  const def = CLASS_DEFINITIONS[player.class];
  return { ...player, hp: def.startingHP, maxHP: def.startingHP, gold: def.startingGold };
}

export function createGameState(roomId: string, players: Player[]): GameState {
  return {
    id: roomId,
    phase: 'lobby',
    floor: 1,
    room: 1,
    players,
    monster: null,
    lastRoundResult: null,
    log: [],
  };
}

export function startCombat(state: GameState): GameState {
  const definition = getMonsterForRoom(state.floor, state.room);
  const monster: MonsterState = {
    definition,
    currentHP: definition.maxHP,
    actionIndex: 0,
    shieldHP: 0,
  };
  const players = state.players.map(p => {
    const deck = shuffleDeck(createDeck(p.id));
    const { dealt: hand, remaining } = dealCards(deck, HAND_SIZE);
    return {
      ...p,
      deck: remaining,
      hand,
      discardPile: [],
      selectedCardIds: [],
      handsLeft: HANDS_PER_ROOM,
      discardsLeft: DISCARDS_PER_ROOM,
      status: 'picking' as const,
    };
  });
  return {
    ...state,
    phase: 'combat',
    monster,
    players,
    lastRoundResult: null,
    log: [...state.log, `⚔️ Entered room ${state.room} — ${definition.name} appears!`],
  };
}

export function selectCards(state: GameState, playerId: string, cardIds: string[]): GameState {
  const players = state.players.map(p =>
    p.id === playerId ? { ...p, selectedCardIds: cardIds.slice(0, 5) } : p
  );
  return { ...state, players };
}

export function discardCards(state: GameState, playerId: string): GameState {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.discardsLeft <= 0 || player.selectedCardIds.length === 0) return state;

  const toDiscard = player.hand.filter(c => player.selectedCardIds.includes(c.id));
  const kept = player.hand.filter(c => !player.selectedCardIds.includes(c.id));
  const drawCount = toDiscard.length;
  const { dealt: newCards, remaining } = dealCards(player.deck, drawCount);

  const newHand = [...kept, ...newCards];
  const newDeck = remaining;
  const newDiscard = [...player.discardPile, ...toDiscard];

  const updated: Player = {
    ...player,
    hand: newHand,
    deck: newDeck,
    discardPile: newDiscard,
    selectedCardIds: [],
    discardsLeft: player.discardsLeft - 1,
  };

  return {
    ...state,
    players: state.players.map(p => (p.id === playerId ? updated : p)),
    log: [...state.log, `${player.name} discarded ${drawCount} card(s).`],
  };
}

export function playHands(state: GameState): GameState {
  if (!state.monster) return state;

  const activePlayers = state.players.filter(p => p.status !== 'dead' && p.selectedCardIds.length > 0);
  if (activePlayers.length === 0) return state;

  // Evaluate all hands first to get hand types (needed for Bard)
  const evaluations = activePlayers.map(p => {
    const played = p.hand.filter(c => p.selectedCardIds.includes(c.id));
    return { player: p, played, evaluation: evaluateHand(played) };
  });
  const allHandTypes = evaluations.map(e => e.evaluation.handType);

  // Score each player's hand
  const playerDamage = evaluations.map(({ player, evaluation }) => {
    const breakdown = scoreHand(player, evaluation, state.players, allHandTypes);
    return {
      playerId: player.id,
      handType: evaluation.handType,
      chips: breakdown.chips,
      mult: breakdown.mult,
      damage: breakdown.damage,
    };
  });

  const totalDamage = playerDamage.reduce((s, p) => s + p.damage, 0);

  // Apply damage to monster
  let { currentHP, shieldHP, actionIndex } = state.monster;
  let effectiveDamage = totalDamage;
  if (shieldHP > 0) {
    const absorbed = Math.min(shieldHP, effectiveDamage);
    effectiveDamage -= absorbed;
    shieldHP -= absorbed;
  }

  // Weakness / immunity
  const def = state.monster.definition;
  const handTypesPlayed = new Set(allHandTypes);
  if (def.immunity && handTypesPlayed.has(def.immunity)) {
    // Nullify damage from immune hand type — simple approximation: treat 0 damage from that player's contribution
    // For prototype: immunity just reduces total by that player's portion
  }
  if (def.weakness && handTypesPlayed.has(def.weakness)) {
    effectiveDamage = Math.round(effectiveDamage * 1.5);
  }

  currentHP = Math.max(0, currentHP - effectiveDamage);
  const monsterDied = currentHP === 0;

  // Determine monster attack
  const monsterAction: AttackAction = def.attackPattern[actionIndex % def.attackPattern.length];
  actionIndex = (actionIndex + 1) % def.attackPattern.length;

  // If monster buffed itself with shield
  if (!monsterDied && monsterAction.type === 'buff-self') {
    shieldHP += 20;
  }

  // Apply monster attack to players
  const damageToPlayers: { playerId: string; damage: number }[] = [];
  if (!monsterDied) {
    if (monsterAction.type === 'attack') {
      // Attack the first living player (or random; simplified to first)
      const target = state.players.find(p => p.status !== 'dead');
      if (target) damageToPlayers.push({ playerId: target.id, damage: (monsterAction as { type: 'attack'; damage: number }).damage });
    } else if (monsterAction.type === 'attack-all') {
      for (const p of state.players.filter(p => p.status !== 'dead')) {
        damageToPlayers.push({ playerId: p.id, damage: (monsterAction as { type: 'attack-all'; damage: number }).damage });
      }
    }
  }

  // Apply damage and replenish hands
  let players = state.players.map(p => {
    const entry = activePlayers.find(ap => ap.id === p.id);
    if (!entry) return p;

    const played = p.hand.filter(c => p.selectedCardIds.includes(c.id));
    const kept = p.hand.filter(c => !p.selectedCardIds.includes(c.id));
    const drawCount = Math.min(played.length, p.deck.length);
    const { dealt: newCards, remaining } = dealCards(p.deck, drawCount);

    let newPlayer: Player = {
      ...p,
      hand: [...kept, ...newCards],
      deck: remaining,
      discardPile: [...p.discardPile, ...played],
      selectedCardIds: [],
      handsLeft: p.handsLeft - 1,
    };

    // Cleric heal
    if (p.class === 'Cleric') {
      const playerEntry = evaluations.find(e => e.player.id === p.id);
      if (playerEntry) {
        const ht = playerEntry.evaluation.handType;
        if (ht === 'full-house') newPlayer = { ...newPlayer, hp: Math.min(newPlayer.maxHP, newPlayer.hp + 5) };
        if (ht === 'pair') newPlayer = { ...newPlayer, hp: Math.min(newPlayer.maxHP, newPlayer.hp + 2) };
      }
    }

    return newPlayer;
  });

  // Apply monster attack damage
  for (const { playerId, damage } of damageToPlayers) {
    players = players.map(p => {
      if (p.id !== playerId) return p;
      const newHP = Math.max(0, p.hp - damage);
      return { ...p, hp: newHP, status: newHP === 0 ? 'dead' as const : p.status };
    });
  }

  const allDead = players.filter(p => p.status !== 'dead').length === 0;

  const roundResult = {
    playerDamage,
    totalDamage: effectiveDamage,
    monsterAction,
    damageToPlayers,
    monsterDied,
  };

  const logEntries = [
    ...playerDamage.map(pd => {
      const pname = players.find(p => p.id === pd.playerId)?.name ?? pd.playerId;
      return `${pname} played ${pd.handType} → ${pd.damage} dmg`;
    }),
    `Total: ${effectiveDamage} dmg → ${def.name} has ${currentHP}/${def.maxHP} HP`,
    monsterDied ? `💀 ${def.name} slain!` : `${def.name}: ${monsterAction.type === 'buff-self' ? (monsterAction as {type:'buff-self';label:string}).label : `attacks for ${(monsterAction as {damage:number}).damage ?? '?'}`}`,
  ];

  let newPhase = state.phase;
  const updatedMonster: MonsterState = {
    ...state.monster,
    currentHP,
    shieldHP,
    actionIndex,
  };

  if (monsterDied) {
    newPhase = 'round-result';
  } else if (allDead) {
    newPhase = 'defeat';
  } else {
    newPhase = 'round-result';
  }

  return {
    ...state,
    phase: newPhase,
    monster: updatedMonster,
    players,
    lastRoundResult: roundResult,
    log: [...state.log, ...logEntries],
  };
}

export function advanceAfterResult(state: GameState): GameState {
  if (!state.lastRoundResult) return state;

  const { monsterDied } = state.lastRoundResult;
  const allDead = state.players.every(p => p.status === 'dead');

  if (allDead) return { ...state, phase: 'defeat' };

  if (monsterDied) {
    // Award gold
    const rewardGold = state.monster?.definition.rewardGold ?? 0;
    const players = state.players.map(p =>
      p.status !== 'dead' ? { ...p, gold: p.gold + rewardGold } : p
    );

    const isLastRoom = state.room >= 3;
    if (isLastRoom) {
      // Check if it was the final boss (floor 2 room 3)
      if (state.floor >= 2) {
        return { ...state, players, phase: 'victory' };
      }
      // Next floor
      return {
        ...state,
        players,
        phase: 'shop',
        floor: state.floor + 1,
        room: 1,
        log: [...state.log, `🏆 Boss defeated! Moving to floor ${state.floor + 1}. Visit the shop.`],
      };
    }

    return {
      ...state,
      players,
      phase: 'shop',
      room: state.room + 1,
      log: [...state.log, `💰 Each player earned ${rewardGold} gold. Visit the shop.`],
    };
  }

  // Monster alive — check if any player has hands left
  const anyHandsLeft = state.players.some(p => p.status !== 'dead' && p.handsLeft > 0);
  if (!anyHandsLeft) {
    return { ...state, phase: 'defeat' };
  }

  // Continue combat
  const players = state.players.map(p => ({ ...p, status: p.status === 'dead' ? 'dead' as const : 'picking' as const }));
  return { ...state, phase: 'combat', players, lastRoundResult: null };
}

export function buyJoker(state: GameState, playerId: string, jokerId: string): GameState {
  const player = state.players.find(p => p.id === playerId);
  const shopJokers = getShopJokers(state.floor, state.room);
  const joker = shopJokers.find(j => j.id === jokerId);
  if (!player || !joker || player.gold < joker.cost || player.jokers.length >= 5) return state;

  const players = state.players.map(p =>
    p.id === playerId
      ? { ...p, gold: p.gold - joker.cost, jokers: [...p.jokers, joker] }
      : p
  );
  return {
    ...state,
    players,
    log: [...state.log, `${player.name} bought ${joker.name}.`],
  };
}

export function endShop(state: GameState): GameState {
  return startCombat(state);
}
