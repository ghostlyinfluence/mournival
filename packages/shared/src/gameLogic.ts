import { AttackAction, FloorMap, GameState, HandType, MapNode, MonsterState, NodeType, OpenPackState, PackType, Player, ShopPack } from './types.js';
import { CLASS_DEFINITIONS } from './classes.js';
import { createDeck, dealCards, randomPackCards, shuffleDeck } from './cards.js';
import { evaluateHand } from './hands.js';
import { scoreHand } from './scoring.js';
import { getMonsterForNode, getMonsterForRoom } from './monsters.js';
import { sampleJokers } from './jokers.js';
import { applyConsumableEffect, sampleArcanas, sampleCelestials } from './consumables.js';

const HAND_SIZE = 8;
const HANDS_PER_ROOM = 3;
const DISCARDS_PER_ROOM = 3;

// ── Map generation ────────────────────────────────────────────────────────────

const MAP_ROWS = 15;   // rows 0–14, boss sits at row 15
const MAP_COLS = 6;    // columns 0–5
const MAP_PATHS = 3;   // seed paths through the map

const FORCED_NODE_TYPES: Partial<Record<number, NodeType>> = {
  4: 'shop',
  6: 'rest',
  9: 'shop',
  11: 'rest',
  13: 'elite',
};

function generateFloorMap(floor: number): FloorMap {
  // Three paths wander from fixed starting columns through all 15 rows
  const startCols = [1, 3, 5];
  const paths: number[][] = startCols.slice(0, MAP_PATHS).map(start => {
    const path = [start];
    for (let r = 1; r < MAP_ROWS; r++) {
      const prev = path[r - 1];
      const delta = Math.floor(Math.random() * 3) - 1; // −1, 0, +1
      path.push(Math.max(0, Math.min(MAP_COLS - 1, prev + delta)));
    }
    return path;
  });

  // Collect unique (row, col) pairs
  const keySet = new Set<string>();
  for (const path of paths) {
    for (let r = 0; r < MAP_ROWS; r++) keySet.add(`${r}_${path[r]}`);
  }

  const nodes: MapNode[] = [];
  for (const key of keySet) {
    const sep = key.indexOf('_');
    const r = Number(key.substring(0, sep));
    const col = Number(key.substring(sep + 1));
    const forced = FORCED_NODE_TYPES[r];
    const type: NodeType = forced ?? (r > 0 && Math.random() < 0.15 ? 'elite' : 'combat');
    nodes.push({ id: `n${r}_${col}`, row: r, col, type, connections: [], visited: false, available: r === 0 });
  }

  // Boss node at top-center
  nodes.push({ id: 'boss', row: MAP_ROWS, col: 2, type: 'boss', connections: [], visited: false, available: false });

  // Wire connections from path transitions
  const connSet = new Set<string>();
  for (const path of paths) {
    for (let r = 0; r < MAP_ROWS - 1; r++) {
      connSet.add(`n${r}_${path[r]}->n${r + 1}_${path[r + 1]}`);
    }
    connSet.add(`n${MAP_ROWS - 1}_${path[MAP_ROWS - 1]}->boss`);
  }
  for (const conn of connSet) {
    const arrow = conn.indexOf('->');
    const fromId = conn.substring(0, arrow);
    const toId = conn.substring(arrow + 2);
    const node = nodes.find(n => n.id === fromId);
    if (node && !node.connections.includes(toId)) node.connections.push(toId);
  }

  return { nodes, currentNodeId: null };
}

function startCombatAtNode(state: GameState, node: MapNode): GameState {
  const definition = getMonsterForNode(
    state.floor, node.row, node.type === 'elite', node.type === 'boss',
  );
  const monster: MonsterState = { definition, currentHP: definition.maxHP, actionIndex: 0, shieldHP: 0 };
  const players = state.players.map(p => {
    const allCards = [...p.deck, ...p.hand, ...p.discardPile];
    const deck = shuffleDeck(allCards.length > 0 ? allCards : createDeck(p.id));
    const { dealt: hand, remaining } = dealCards(deck, HAND_SIZE);
    return { ...p, deck: remaining, hand, discardPile: [], selectedCardIds: [], handsLeft: HANDS_PER_ROOM, discardsLeft: DISCARDS_PER_ROOM, status: 'picking' as const };
  });
  const typeLabel = node.type === 'boss' ? '☠ Boss' : node.type === 'elite' ? '⭐ Elite' : '⚔';
  return {
    ...state,
    phase: 'combat',
    monster,
    players,
    lastRoundResult: null,
    shopJokers: [],
    shopConsumables: [],
    shopPacks: [],
    log: [...state.log, `${typeLabel} — ${definition.name} appears! (Depth ${node.row + 1})`],
  };
}

function applyRestNode(state: GameState, depth: number): GameState {
  const healedPlayers = state.players.map(p => {
    if (p.status === 'dead') return p;
    const heal = Math.floor(p.maxHP * 0.25);
    return { ...p, hp: Math.min(p.maxHP, p.hp + heal) };
  });
  const healLog = state.players
    .filter(p => p.status !== 'dead')
    .map(p => {
      const after = healedPlayers.find(hp => hp.id === p.id)!;
      const gained = after.hp - p.hp;
      return `🔥 ${p.name} rested — recovered ${gained} HP (${after.hp}/${after.maxHP})`;
    });
  return {
    ...state,
    players: healedPlayers,
    phase: 'map',
    log: [...state.log, `🔥 Campfire at depth ${depth + 1}. The party rests.`, ...healLog],
  };
}

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
    shopPacks: [],
    floorMap: null,
    log: [],
  };
}

/** Generate the map for the current floor and enter 'map' phase. */
export function startFloor(state: GameState): GameState {
  const floorMap = generateFloorMap(state.floor);
  return {
    ...state,
    phase: 'map',
    floorMap,
    monster: null,
    lastRoundResult: null,
    log: [...state.log, `🗺 Floor ${state.floor} — choose your path.`],
  };
}

/** Select a map node and branch into the appropriate phase. */
export function selectNode(state: GameState, nodeId: string): GameState {
  const map = state.floorMap;
  if (!map) return state;

  const node = map.nodes.find(n => n.id === nodeId);
  if (!node || !node.available) return state;

  const updatedNodes = map.nodes.map(n => {
    if (n.id === nodeId) return { ...n, visited: true, available: false };
    if (node.connections.includes(n.id)) return { ...n, available: true };
    if (n.available && n.row === node.row) return { ...n, available: false };
    return n;
  });

  const newMap: FloorMap = { ...map, nodes: updatedNodes, currentNodeId: nodeId };
  const base = { ...state, floorMap: newMap };

  switch (node.type) {
    case 'combat':
    case 'elite':
    case 'boss':
      return startCombatAtNode(base, node);
    case 'shop': {
      const shop = generateShopInventory(state.floor);
      return { ...base, phase: 'shop', ...shop, log: [...state.log, `🛒 Shop — depth ${node.row + 1}.`] };
    }
    case 'rest':
      return applyRestNode(base, node.row);
  }
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
    // Reshuffle all existing cards so arcana-applied enhancements persist across rooms.
    // Creating a fresh deck would wipe wild, bonus, mult, etc. enhancements.
    const allCards = [...p.deck, ...p.hand, ...p.discardPile];
    const deck = shuffleDeck(allCards.length > 0 ? allCards : createDeck(p.id));
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
    shopPacks: [],
    floorMap: state.floorMap,
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
  const { dealt: newCards, remaining } = dealCards(player.deck, HAND_SIZE - kept.length);

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

  const def = state.monster.definition;

  const playerDamage = evaluations.map(({ player, evaluation }) => {
    const breakdown = scoreHand(player, evaluation, state.players, allHandTypes);
    const isImmune = def.immunity != null && evaluation.handType === def.immunity;
    return {
      playerId: player.id,
      handType: evaluation.handType,
      chips: breakdown.chips,
      mult: breakdown.mult,
      damage: isImmune ? 0 : breakdown.damage,
      goldFromCards: breakdown.goldFromCards,
      glassCardIds: evaluation.scoringCards
        .filter(c => c.enhancement === 'glass')
        .map(c => c.id),
      isImmune,
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

  if (def.weakness && evaluations.some(e => e.evaluation.handType === def.weakness)) {
    effectiveDamage = Math.round(effectiveDamage * 1.5);
  }

  currentHP = Math.max(0, currentHP - effectiveDamage);
  const monsterDied = currentHP === 0;

  const monsterAction: AttackAction = def.attackPattern[actionIndex % def.attackPattern.length];
  actionIndex = (actionIndex + 1) % def.attackPattern.length;

  if (!monsterDied && monsterAction.type === 'buff-self') {
    shieldHP += monsterAction.shield ?? 0;
  }

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
    const { dealt: newCards, remaining } = dealCards(p.deck, HAND_SIZE - kept.length);

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

  // Apply debuff effects
  const debuffLog: string[] = [];
  if (!monsterDied && monsterAction.type === 'debuff-player') {
    const living = players.filter(p => p.status !== 'dead');
    const target = living[0];

    if (monsterAction.stealGold != null && target) {
      const stolen = Math.min(target.gold, monsterAction.stealGold);
      players = players.map(p =>
        p.id === target.id ? { ...p, gold: Math.max(0, p.gold - stolen) } : p
      );
      if (stolen > 0) debuffLog.push(`${def.name} drained ${stolen} gold from ${target.name}!`);
    }

    if (monsterAction.reduceHands != null) {
      players = players.map(p =>
        p.status !== 'dead'
          ? { ...p, handsLeft: Math.max(0, p.handsLeft - monsterAction.reduceHands!) }
          : p
      );
      debuffLog.push(`${def.name}'s wail costs everyone 1 hand!`);
    }

    if (monsterAction.reduceMaxHP != null && living.length > 0) {
      const cursed = living[Math.floor(Math.random() * living.length)];
      const newMaxHP = Math.max(1, cursed.maxHP - monsterAction.reduceMaxHP);
      players = players.map(p =>
        p.id === cursed.id ? { ...p, maxHP: newMaxHP, hp: Math.min(p.hp, newMaxHP) } : p
      );
      debuffLog.push(`${cursed.name} is cursed — max HP reduced by ${monsterAction.reduceMaxHP}!`);
    }

    if (monsterAction.discardRandom != null && target) {
      const toDiscard = [...target.hand]
        .sort(() => Math.random() - 0.5)
        .slice(0, monsterAction.discardRandom);
      const discardIds = new Set(toDiscard.map(c => c.id));
      players = players.map(p =>
        p.id !== target.id ? p : {
          ...p,
          hand: p.hand.filter(c => !discardIds.has(c.id)),
          discardPile: [...p.discardPile, ...toDiscard],
        }
      );
      if (toDiscard.length > 0) {
        debuffLog.push(`Acid Splash — ${target.name} discarded ${toDiscard.length} card(s)!`);
      }
    }
  }

  // Interest: $1 per $5 gold held, max $5 — only when the monster dies this round
  const interestGained: { playerId: string; amount: number }[] = [];
  if (monsterDied) {
    players = players.map(p => {
      if (p.status === 'dead') return p;
      const interest = Math.min(5, Math.floor(p.gold / 5));
      if (interest > 0) {
        interestGained.push({ playerId: p.id, amount: interest });
        return { ...p, gold: p.gold + interest };
      }
      return p;
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
    interestGained,
    brokenCards,
    mournivalTriggered,
    monsterDied,
  };

  const logLines = [
    ...(mournivalTriggered ? ['⚜️ THE MOURNIVAL! All players played four of a kind or better — ×4 party damage!'] : []),
    ...playerDamageFinal.map(pd => {
      const name = players.find(p => p.id === pd.playerId)?.name ?? pd.playerId;
      const immuneNote = pd.isImmune ? ' (immune!)' : '';
      return `${name} played ${pd.handType} → ${pd.damage} dmg${immuneNote}`;
    }),
    `Total: ${effectiveDamage} dmg → ${def.name} has ${currentHP}/${def.maxHP} HP`,
    ...(brokenCards.length ? [`💔 ${brokenCards.length} glass card(s) shattered!`] : []),
    ...(goldGained.length ? goldGained.map(g => {
      const name = players.find(p => p.id === g.playerId)?.name ?? g.playerId;
      return `${name} gained ${g.amount} gold from gold cards`;
    }) : []),
    ...(interestGained.length ? interestGained.map(g => {
      const name = players.find(p => p.id === g.playerId)?.name ?? g.playerId;
      return `💵 ${name} earned ${g.amount} gold interest`;
    }) : []),
    monsterDied
      ? `💀 ${def.name} slain!`
      : monsterAction.type === 'attack' || monsterAction.type === 'attack-all'
        ? `${def.name} attacks for ${(monsterAction as { damage: number }).damage}`
        : `${def.name}: ${(monsterAction as { label: string }).label}`,
    ...debuffLog,
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

// ── Shop generation ───────────────────────────────────────────────────────────

const PACK_DEFS: Record<PackType, { name: string; description: string; cost: number }> = {
  joker:     { name: 'Joker Pack',          description: 'Reveals 3 jokers — pick 1 to keep.',           cost: 7 },
  arcana:    { name: 'Arcana Pack',          description: 'Reveals 3 arcana — pick 1 to keep.',           cost: 5 },
  celestial: { name: 'Celestial Stone Pack', description: 'Reveals 3 celestial stones — pick 1 to keep.', cost: 6 },
  card:      { name: 'Card Pack',            description: 'Reveals 3 enhanced cards — pick 1 for your deck.', cost: 4 },
};

function generateShopInventory(floor: number): Pick<GameState, 'shopJokers' | 'shopConsumables' | 'shopPacks'> {
  // 2 individual items: each slot is independently joker / arcana / celestial
  let jokerCount = 0;
  const consumables = [];
  for (let i = 0; i < 2; i++) {
    const r = Math.random();
    if (r < 1 / 3) jokerCount++;
    else if (r < 2 / 3) consumables.push(...sampleArcanas(floor, 1));
    else consumables.push(...sampleCelestials(floor, 1));
  }

  // 2 packs: random type each
  const packTypes: PackType[] = ['joker', 'arcana', 'celestial', 'card'];
  const uid = () => Math.random().toString(36).slice(2, 7);
  const shopPacks: ShopPack[] = [0, 1].map(i => {
    const type = packTypes[Math.floor(Math.random() * packTypes.length)];
    return { id: `pack-${type}-${i}-${uid()}`, type, ...PACK_DEFS[type] };
  });

  return {
    shopJokers: jokerCount > 0 ? sampleJokers(floor, jokerCount) : [],
    shopConsumables: consumables,
    shopPacks,
  };
}

function generatePackContents(pack: ShopPack, floor: number): OpenPackState {
  switch (pack.type) {
    case 'joker':     return { packType: 'joker',     jokerContents: sampleJokers(floor, 3),    consumableContents: [],                  cardContents: [],              picksRemaining: 1 };
    case 'arcana':    return { packType: 'arcana',    jokerContents: [],                         consumableContents: sampleArcanas(floor, 3),   cardContents: [],              picksRemaining: 1 };
    case 'celestial': return { packType: 'celestial', jokerContents: [],                         consumableContents: sampleCelestials(floor, 3), cardContents: [],              picksRemaining: 1 };
    case 'card':      return { packType: 'card',      jokerContents: [],                         consumableContents: [],                  cardContents: randomPackCards(3), picksRemaining: 1 };
  }
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

    // Boss detection: check current map node type, fall back to monster definition
    const currentNode = state.floorMap?.nodes.find(n => n.id === state.floorMap?.currentNodeId);
    const isBoss = currentNode?.type === 'boss' || state.monster?.definition.isBoss === true;

    if (isBoss) {
      const nextFloor = state.floor + 1;
      const isLastFloor = state.floor >= 2;
      if (isLastFloor) {
        return { ...state, players, phase: 'victory', log: [...state.log, '🏆 The dungeon is cleared!'] };
      }
      const newMap = generateFloorMap(nextFloor);
      return {
        ...state,
        players,
        phase: 'map',
        floor: nextFloor,
        room: 1,
        floorMap: newMap,
        monster: null,
        lastRoundResult: null,
        log: [...state.log, `💰 Earned ${rewardGold} gold each. Advancing to floor ${nextFloor}.`],
      };
    }

    if (state.floorMap) {
      // Map-based game: return to map after regular monster kill
      return {
        ...state,
        players,
        phase: 'map',
        monster: null,
        lastRoundResult: null,
        log: [...state.log, `💰 Earned ${rewardGold} gold each. Choose your next path.`],
      };
    }

    // Legacy / test path: room-based shop progression
    const isLastRoom = state.room >= 3;
    const isLastFloor = state.floor >= 2;

    if (isLastRoom && isLastFloor) {
      return { ...state, players, phase: 'victory' };
    }

    const nextFloor = isLastRoom ? state.floor + 1 : state.floor;
    const nextRoom = isLastRoom ? 1 : state.room + 1;
    const shop = generateShopInventory(nextFloor);
    return {
      ...state,
      players,
      phase: 'shop',
      floor: nextFloor,
      room: nextRoom,
      ...shop,
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
  return { ...state, phase: 'map', shopJokers: [], shopConsumables: [], shopPacks: [] };
}

export function buyPack(state: GameState, playerId: string, packId: string): GameState {
  const player = state.players.find(p => p.id === playerId);
  const pack = state.shopPacks.find(pk => pk.id === packId);
  if (!player || !pack || player.gold < pack.cost || player.openPack) return state;

  const openPack = generatePackContents(pack, state.floor);
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, gold: p.gold - pack.cost, openPack } : p
    ),
    shopPacks: state.shopPacks.filter(pk => pk.id !== packId),
    log: [...state.log, `${player.name} opened a ${pack.name}.`],
  };
}

export function pickFromPack(state: GameState, playerId: string, itemId: string): GameState {
  const player = state.players.find(p => p.id === playerId);
  if (!player?.openPack) return state;

  const pack = player.openPack;
  let np = { ...player };

  const joker = pack.jokerContents.find(j => j.id === itemId);
  if (joker && np.jokers.length < 5) np = { ...np, jokers: [...np.jokers, joker] };

  const consumable = pack.consumableContents.find(c => c.id === itemId);
  if (consumable && np.consumables.length < 2) np = { ...np, consumables: [...np.consumables, consumable] };

  const card = pack.cardContents.find(c => c.id === itemId);
  if (card) np = { ...np, deck: [...np.deck, card] };

  const picksRemaining = pack.picksRemaining - 1;
  np = { ...np, openPack: picksRemaining > 0 ? { ...pack, picksRemaining } : undefined };

  return {
    ...state,
    players: state.players.map(p => p.id === playerId ? np : p),
    log: [...state.log, `${player.name} picked from ${pack.packType} pack.`],
  };
}

export function closePack(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, openPack: undefined } : p
    ),
  };
}
