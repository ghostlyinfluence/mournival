import { AttackAction, GameState, HandType, MonsterState, Player } from './types.js';
import { CLASS_DEFINITIONS } from './classes.js';
import { createDeck, dealCards, shuffleDeck } from './cards.js';
import { evaluateHand } from './hands.js';
import { scoreHand } from './scoring.js';
import { getMonsterForRoom } from './monsters.js';
import { getShopJokers } from './jokers.js';
import { applyConsumableEffect, getShopConsumables } from './consumables.js';

const HAND_SIZE = 8;
const HANDS_PER_ROOM = 3;
const DISCARDS_PER_ROOM = 3;

export function initPlayer(id: string, name: string): Player {
  const deck = shuffleDeck(createDeck(`${id}`));
  const { dealt: hand, remaining } = dealCards(deck, HAND_SIZE);
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
    consumables: [],
    handLevels: {},
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
    shopJokers: [],
    shopConsumables: [],
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
    shopJokers: [],
    shopConsumables: [],
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
  const { dealt: newCards, remaining } = dealCards(player.deck, toDiscard.length);

  const updated: Player = {
    ...player,
    hand: [...kept, ...newCards],
    deck: remaining,
    discardPile: [...player.discardPile, ...toDiscard],
    selectedCardIds: [],
    discardsLeft: player.discardsLeft - 1,
  };

  return {
    ...state,
    players: state.players.map(p => (p.id === playerId ? updated : p)),
    log: [...state.log, `${player.name} discarded ${toDiscard.length} card(s).`],
  };
}

export function playHands(state: GameState): GameState {
  if (!state.monster) return state;

  const activePlayers = state.players.filter(p => p.status !== 'dead' && p.selectedCardIds.length > 0);
  if (activePlayers.length === 0) return state;

  const evaluations = activePlayers.map(p => {
    const played = p.hand.filter(c => p.selectedCardIds.includes(c.id));
    return { player: p, played, evaluation: evaluateHand(played) };
  });
  const allHandTypes = evaluations.map(e => e.evaluation.handType);

  const playerDamage = evaluations.map(({ player, evaluation }) => {
    const breakdown = scoreHand(player, evaluation, state.players, allHandTypes);
    return {
      playerId: player.id,
      handType: evaluation.handType,
      chips: breakdown.chips,
      mult: breakdown.mult,
      damage: breakdown.damage,
      goldFromCards: breakdown.goldFromCards,
      glassCardIds: evaluation.scoringCards
        .filter(c => c.enhancement === 'glass')
        .map(c => c.id),
    };
  });

  // ── The Mournival team combo ──────────────────────────────────────────────
  // Triggers when ALL active players (≥2) each play Four of a Kind or better.
  // Named for the old Gleek term "mournival" = four of a kind.
  const MOURNIVAL_HANDS: HandType[] = [
    'four-of-a-kind', 'straight-flush', 'royal-flush',
    'five-of-a-kind', 'flush-house', 'flush-five',
  ];
  const mournivalTriggered =
    activePlayers.length >= 2 &&
    evaluations.every(e => MOURNIVAL_HANDS.includes(e.evaluation.handType));

  let playerDamageFinal = playerDamage;
  if (mournivalTriggered) {
    playerDamageFinal = playerDamage.map(pd => ({
      ...pd,
      damage: pd.damage * 4,
    }));
  }

  const totalDamage = playerDamageFinal.reduce((s, p) => s + p.damage, 0);

  let { currentHP, shieldHP, actionIndex } = state.monster;
  let effectiveDamage = totalDamage;
  if (shieldHP > 0) {
    const absorbed = Math.min(shieldHP, effectiveDamage);
    effectiveDamage -= absorbed;
    shieldHP -= absorbed;
  }

  const def = state.monster.definition;
  if (def.weakness && evaluations.some(e => e.evaluation.handType === def.weakness)) {
    effectiveDamage = Math.round(effectiveDamage * 1.5);
  }

  currentHP = Math.max(0, currentHP - effectiveDamage);
  const monsterDied = currentHP === 0;

  const monsterAction: AttackAction = def.attackPattern[actionIndex % def.attackPattern.length];
  actionIndex = (actionIndex + 1) % def.attackPattern.length;

  if (!monsterDied && monsterAction.type === 'buff-self') shieldHP += 20;

  // Monster attacks players
  const damageToPlayers: { playerId: string; damage: number }[] = [];
  if (!monsterDied) {
    if (monsterAction.type === 'attack') {
      const target = state.players.find(p => p.status !== 'dead');
      if (target) damageToPlayers.push({ playerId: target.id, damage: monsterAction.damage });
    } else if (monsterAction.type === 'attack-all') {
      for (const p of state.players.filter(p => p.status !== 'dead')) {
        damageToPlayers.push({ playerId: p.id, damage: monsterAction.damage });
      }
    }
  }

  // Gold gained from gold-enhanced cards
  const goldGained: { playerId: string; amount: number }[] = playerDamage
    .filter(pd => pd.goldFromCards > 0)
    .map(pd => ({ playerId: pd.playerId, amount: pd.goldFromCards }));

  // Glass cards that might break (25% each)
  const brokenCards: string[] = [];
  for (const pd of playerDamage) {
    for (const cardId of pd.glassCardIds) {
      if (Math.random() < 0.25) brokenCards.push(cardId);
    }
  }

  // Apply: replenish hand, take monster damage, apply gold, remove broken cards
  let players = state.players.map(p => {
    const entry = activePlayers.find(ap => ap.id === p.id);
    if (!entry) return p;

    const played = p.hand.filter(c => p.selectedCardIds.includes(c.id));
    const kept = p.hand.filter(c => !p.selectedCardIds.includes(c.id));
    const { dealt: newCards, remaining } = dealCards(p.deck, Math.min(played.length, p.deck.length));

    let np: Player = {
      ...p,
      hand: [...kept, ...newCards],
      deck: remaining,
      discardPile: [...p.discardPile, ...played],
      selectedCardIds: [],
      handsLeft: p.handsLeft - 1,
    };

    // Cleric heals
    if (p.class === 'Cleric') {
      const ev = evaluations.find(e => e.player.id === p.id);
      if (ev) {
        if (ev.evaluation.handType === 'full-house') np = { ...np, hp: Math.min(np.maxHP, np.hp + 5) };
        if (ev.evaluation.handType === 'pair') np = { ...np, hp: Math.min(np.maxHP, np.hp + 2) };
      }
    }

    // Gold from gold-enhanced cards
    const goldEntry = goldGained.find(g => g.playerId === p.id);
    if (goldEntry) np = { ...np, gold: np.gold + goldEntry.amount };

    // Remove broken glass cards everywhere
    for (const cardId of brokenCards) {
      np = {
        ...np,
        hand: np.hand.filter(c => c.id !== cardId),
        deck: np.deck.filter(c => c.id !== cardId),
        discardPile: np.discardPile.filter(c => c.id !== cardId),
      };
    }

    return np;
  });

  // Apply monster damage
  for (const { playerId, damage } of damageToPlayers) {
    players = players.map(p => {
      if (p.id !== playerId) return p;
      const newHP = Math.max(0, p.hp - damage);
      return { ...p, hp: newHP, status: newHP === 0 ? 'dead' as const : p.status };
    });
  }

  const allDead = players.every(p => p.status === 'dead');

  const roundResult = {
    playerDamage: playerDamageFinal.map(pd => ({
      playerId: pd.playerId,
      handType: pd.handType,
      chips: pd.chips,
      mult: pd.mult,
      damage: pd.damage,
    })),
    totalDamage: effectiveDamage,
    monsterAction,
    damageToPlayers,
    goldGained,
    brokenCards,
    mournivalTriggered,
    monsterDied,
  };

  const logLines = [
    ...(mournivalTriggered ? ['⚜️ THE MOURNIVAL! All players played four of a kind or better — ×4 party damage!'] : []),
    ...playerDamageFinal.map(pd => {
      const name = players.find(p => p.id === pd.playerId)?.name ?? pd.playerId;
      return `${name} played ${pd.handType} → ${pd.damage} dmg`;
    }),
    `Total: ${effectiveDamage} dmg → ${def.name} has ${currentHP}/${def.maxHP} HP`,
    ...(brokenCards.length ? [`💔 ${brokenCards.length} glass card(s) shattered!`] : []),
    ...(goldGained.length ? goldGained.map(g => {
      const name = players.find(p => p.id === g.playerId)?.name ?? g.playerId;
      return `${name} gained ${g.amount} gold from gold cards`;
    }) : []),
    monsterDied
      ? `💀 ${def.name} slain!`
      : monsterAction.type === 'attack' || monsterAction.type === 'attack-all'
        ? `${def.name} attacks for ${(monsterAction as { damage: number }).damage}`
        : `${def.name}: ${(monsterAction as { label: string }).label}`,
  ];

  return {
    ...state,
    phase: allDead ? 'defeat' : 'round-result',
    monster: { ...state.monster, currentHP, shieldHP, actionIndex },
    players,
    lastRoundResult: roundResult,
    log: [...state.log, ...logLines],
  };
}

export function advanceAfterResult(state: GameState): GameState {
  if (!state.lastRoundResult) return state;

  const { monsterDied } = state.lastRoundResult;
  const allDead = state.players.every(p => p.status === 'dead');

  if (allDead) return { ...state, phase: 'defeat' };

  if (monsterDied) {
    const rewardGold = state.monster?.definition.rewardGold ?? 0;
    const players = state.players.map(p =>
      p.status !== 'dead' ? { ...p, gold: p.gold + rewardGold } : p
    );

    const isLastRoom = state.room >= 3;
    const isLastFloor = state.floor >= 2;

    if (isLastRoom && isLastFloor) {
      return { ...state, players, phase: 'victory' };
    }

    const nextFloor = isLastRoom ? state.floor + 1 : state.floor;
    const nextRoom = isLastRoom ? 1 : state.room + 1;

    return {
      ...state,
      players,
      phase: 'shop',
      floor: nextFloor,
      room: nextRoom,
      shopJokers: getShopJokers(state.floor, state.room),
      shopConsumables: getShopConsumables(state.floor),
      log: [...state.log, `💰 Earned ${rewardGold} gold each. Visit the shop.`],
    };
  }

  // Monster still alive
  const anyHandsLeft = state.players.some(p => p.status !== 'dead' && p.handsLeft > 0);
  if (!anyHandsLeft) return { ...state, phase: 'defeat' };

  const players = state.players.map(p => ({
    ...p,
    status: p.status === 'dead' ? 'dead' as const : 'picking' as const,
  }));
  return { ...state, phase: 'combat', players, lastRoundResult: null };
}

export function buyJoker(state: GameState, playerId: string, jokerId: string): GameState {
  const player = state.players.find(p => p.id === playerId);
  const joker = state.shopJokers.find(j => j.id === jokerId);
  if (!player || !joker || player.gold < joker.cost || player.jokers.length >= 5) return state;

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, gold: p.gold - joker.cost, jokers: [...p.jokers, joker] } : p
    ),
    shopJokers: state.shopJokers.filter(j => j.id !== jokerId),
    log: [...state.log, `${player.name} bought ${joker.name}.`],
  };
}

export function buyConsumable(state: GameState, playerId: string, consumableId: string): GameState {
  const player = state.players.find(p => p.id === playerId);
  const consumable = state.shopConsumables.find(c => c.id === consumableId);
  if (!player || !consumable || player.gold < consumable.cost || player.consumables.length >= 2) return state;

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId
        ? { ...p, gold: p.gold - consumable.cost, consumables: [...p.consumables, consumable] }
        : p
    ),
    shopConsumables: state.shopConsumables.filter(c => c.id !== consumableId),
    log: [...state.log, `${player.name} bought ${consumable.name}.`],
  };
}

export function useConsumable(
  state: GameState,
  playerId: string,
  consumableId: string,
  targetCardIds: string[],
): GameState {
  const player = state.players.find(p => p.id === playerId);
  const consumable = player?.consumables.find(c => c.id === consumableId);
  if (!player || !consumable) return state;

  // Validate target count
  if (
    targetCardIds.length < consumable.minTargets ||
    targetCardIds.length > consumable.maxTargets
  ) {
    return state;
  }

  const withEffect = applyConsumableEffect(state, playerId, consumable, targetCardIds);

  // Remove the used consumable
  return {
    ...withEffect,
    players: withEffect.players.map(p =>
      p.id === playerId
        ? { ...p, consumables: p.consumables.filter(c => c.id !== consumableId) }
        : p
    ),
  };
}

export function endShop(state: GameState): GameState {
  return startCombat(state);
}
