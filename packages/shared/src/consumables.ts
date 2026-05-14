import { Card, ConsumableCard, GameState, HandType, Player, Suit } from './types.js';

// ── Hand level scaling (per level above base) ─────────────────────────────
export const HAND_LEVEL_BONUS: Record<HandType, { chips: number; mult: number }> = {
  'high-card':       { chips: 10, mult: 1 },
  'pair':            { chips: 15, mult: 1 },
  'two-pair':        { chips: 20, mult: 1 },
  'three-of-a-kind': { chips: 20, mult: 2 },
  'straight':        { chips: 30, mult: 3 },
  'flush':           { chips: 15, mult: 2 },
  'full-house':      { chips: 25, mult: 2 },
  'four-of-a-kind':  { chips: 30, mult: 3 },
  'straight-flush':  { chips: 40, mult: 4 },
  'royal-flush':     { chips: 50, mult: 4 },
  'five-of-a-kind':  { chips: 35, mult: 3 },
  'flush-house':     { chips: 40, mult: 4 },
  'flush-five':      { chips: 50, mult: 5 },
};

// ── Arcana definitions (Deck of Many Things themed) ───────────────────────
interface ArcanaDefinition {
  defId: string;
  name: string;
  description: string;
  flavour: string;
  cost: number;
  minTargets: number;
  maxTargets: number;
  rarity: 'common' | 'uncommon' | 'rare';
}

export const ARCANA_DEFS: ArcanaDefinition[] = [
  {
    defId: 'arcana-gem',
    name: 'The Gem',
    description: 'Gain 15 gold.',
    flavour: '"Wealth beyond measure, drawn from nothing." — DotMT',
    cost: 3,
    minTargets: 0, maxTargets: 0,
    rarity: 'uncommon',
  },
  {
    defId: 'arcana-donjon',
    name: 'The Donjon',
    description: 'Double your current gold (max +20).',
    flavour: '"Abundance imprisoned by luck." — DotMT',
    cost: 4,
    minTargets: 0, maxTargets: 0,
    rarity: 'rare',
  },
  {
    defId: 'arcana-vizier',
    name: 'The Vizier',
    description: 'Level up a random hand type you have not yet levelled.',
    flavour: '"Counsel comes at a price." — DotMT',
    cost: 5,
    minTargets: 0, maxTargets: 0,
    rarity: 'uncommon',
  },
  {
    defId: 'arcana-jester',
    name: 'The Jester',
    description: 'Gain a random arcana card.',
    flavour: `"The fool's reward is another chance to be foolish." — DotMT`,
    cost: 2,
    minTargets: 0, maxTargets: 0,
    rarity: 'common',
  },
  {
    defId: 'arcana-fates',
    name: 'The Fates',
    description: 'Replace this card with a different random arcana.',
    flavour: '"Even fate can be renegotiated." — DotMT',
    cost: 1,
    minTargets: 0, maxTargets: 0,
    rarity: 'common',
  },
  {
    defId: 'arcana-sun',
    name: 'The Sun',
    description: 'Add Bonus enhancement (+30 chips when scoring) to 1–3 selected cards.',
    flavour: '"Light reveals what shadows conceal." — DotMT',
    cost: 5,
    minTargets: 1, maxTargets: 3,
    rarity: 'common',
  },
  {
    defId: 'arcana-moon',
    name: 'The Moon',
    description: 'Change suit of 1–3 selected cards to ♥.',
    flavour: `"Selune's gaze turns all things silver." — DotMT`,
    cost: 3,
    minTargets: 1, maxTargets: 3,
    rarity: 'common',
  },
  {
    defId: 'arcana-star',
    name: 'The Star',
    description: 'Change suit of 1–3 selected cards to ♦.',
    flavour: '"A diamond sky, if you know where to look." — DotMT',
    cost: 3,
    minTargets: 1, maxTargets: 3,
    rarity: 'common',
  },
  {
    defId: 'arcana-balance',
    name: 'The Balance',
    description: 'Change suit of 1–3 selected cards to ♠.',
    flavour: '"The scales tip toward shadow." — DotMT',
    cost: 3,
    minTargets: 1, maxTargets: 3,
    rarity: 'common',
  },
  {
    defId: 'arcana-rogue',
    name: 'The Rogue',
    description: 'Change suit of 1–3 selected cards to ♣.',
    flavour: '"Loyalty is a card you never show." — DotMT',
    cost: 3,
    minTargets: 1, maxTargets: 3,
    rarity: 'common',
  },
  {
    defId: 'arcana-euryale',
    name: 'The Euryale',
    description: 'Add Mult enhancement (+4 mult when scoring) to 1–2 selected cards.',
    flavour: `"The serpent's eye multiplies what it sees." — DotMT`,
    cost: 5,
    minTargets: 1, maxTargets: 2,
    rarity: 'uncommon',
  },
  {
    defId: 'arcana-knight',
    name: 'The Knight',
    description: 'Add Steel enhancement (×1.5 mult while held unplayed) to 1 card.',
    flavour: '"Strength held in reserve is strength multiplied." — DotMT',
    cost: 4,
    minTargets: 1, maxTargets: 1,
    rarity: 'uncommon',
  },
  {
    defId: 'arcana-skull',
    name: 'The Skull',
    description: 'Permanently destroy 1 selected card from your deck.',
    flavour: '"Some debts are paid only once." — DotMT',
    cost: 2,
    minTargets: 1, maxTargets: 1,
    rarity: 'common',
  },
  {
    defId: 'arcana-void',
    name: 'The Void',
    description: 'Destroy 1 selected card and gain 3 gold.',
    flavour: '"The void takes. The void gives." — DotMT',
    cost: 2,
    minTargets: 1, maxTargets: 1,
    rarity: 'common',
  },
  {
    defId: 'arcana-throne',
    name: 'The Throne',
    description: 'Add Gold enhancement (+3 gold when this card scores) to 1 selected card.',
    flavour: '"Power means the gold comes to you." — DotMT',
    cost: 4,
    minTargets: 1, maxTargets: 1,
    rarity: 'uncommon',
  },
  {
    defId: 'arcana-comet',
    name: 'The Comet',
    description: 'Add Wild enhancement (counts as any rank and suit) to 1 selected card. Enables Five of a Kind and Flush Five.',
    flavour: '"It falls where it wills. It becomes what it must." — DotMT',
    cost: 6,
    minTargets: 1, maxTargets: 1,
    rarity: 'rare',
  },
];

// ── Celestial Stone definitions (DnD cosmology themed) ────────────────────
interface CelestialDefinition {
  defId: string;
  name: string;
  levelsHandType: HandType;
  flavour: string;
  cost: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const CELESTIAL_DEFS: CelestialDefinition[] = [
  { defId: 'celestial-high-card',       name: "Shepherd's Lantern",    levelsHandType: 'high-card',       cost: 3, rarity: 'common',    flavour: '"A lone light in the dark still shines."' },
  { defId: 'celestial-pair',            name: 'Twin Moons of Selune',  levelsHandType: 'pair',            cost: 3, rarity: 'common',    flavour: '"Two lights, twice the blessing."' },
  { defId: 'celestial-two-pair',        name: 'The Double Dawn',       levelsHandType: 'two-pair',        cost: 4, rarity: 'common',    flavour: '"The horizon doubles when you know how to look."' },
  { defId: 'celestial-three-oak',       name: "Mystra's Triad",        levelsHandType: 'three-of-a-kind', cost: 4, rarity: 'uncommon',  flavour: '"Three pillars hold up all magic."' },
  { defId: 'celestial-straight',        name: 'The Path of Stars',     levelsHandType: 'straight',        cost: 5, rarity: 'uncommon',  flavour: '"Follow the sequence and the stars guide you home."' },
  { defId: 'celestial-flush',           name: 'The River of Light',    levelsHandType: 'flush',           cost: 5, rarity: 'uncommon',  flavour: '"One river, one truth, one overwhelming flow."' },
  { defId: 'celestial-full-house',      name: 'The Grand Compact',     levelsHandType: 'full-house',      cost: 5, rarity: 'uncommon',  flavour: '"Three and two — the pact that binds the planes."' },
  { defId: 'celestial-four-oak',        name: "The Dragon's Fist",     levelsHandType: 'four-of-a-kind',  cost: 7, rarity: 'rare',      flavour: '"Four claws, one crushing blow."' },
  { defId: 'celestial-str-flush',       name: 'The Storm Serpent',     levelsHandType: 'straight-flush',  cost: 8, rarity: 'rare',      flavour: '"Lightning through a sequence — unstoppable."' },
  { defId: 'celestial-royal-flush',     name: "The Sovereign's Crown", levelsHandType: 'royal-flush',     cost: 10, rarity: 'rare',     flavour: '"Worn only by those who hold all five."' },
  { defId: 'celestial-five-oak',        name: 'The Mournival',         levelsHandType: 'five-of-a-kind',  cost: 12, rarity: 'legendary', flavour: '"A four-of-a-kind was the strongest hand. Then came this."' },
  { defId: 'celestial-flush-house',     name: "The Warden's Sigil",    levelsHandType: 'flush-house',     cost: 9,  rarity: 'rare',      flavour: '"Three, two, one colour. The fortress holds."' },
  { defId: 'celestial-flush-five',      name: 'The Prismatic Accord',  levelsHandType: 'flush-five',      cost: 14, rarity: 'legendary', flavour: '"Five of one kind, one of one colour. Perfect resonance."' },
];

// ── Factory: create a ConsumableCard instance from a definition ───────────
function uid() { return Math.random().toString(36).slice(2, 7); }

export function makeArcana(defId: string): ConsumableCard | null {
  const def = ARCANA_DEFS.find(d => d.defId === defId);
  if (!def) return null;
  return {
    id: `${def.defId}-${uid()}`,
    defId: def.defId,
    name: def.name,
    type: 'arcana',
    description: def.description,
    flavour: def.flavour,
    cost: def.cost,
    minTargets: def.minTargets,
    maxTargets: def.maxTargets,
  };
}

export function makeCelestial(defId: string): ConsumableCard | null {
  const def = CELESTIAL_DEFS.find(d => d.defId === defId);
  if (!def) return null;
  return {
    id: `${def.defId}-${uid()}`,
    defId: def.defId,
    name: def.name,
    type: 'celestial',
    description: `Level up ${def.levelsHandType.replace(/-/g, ' ')} — adds ${HAND_LEVEL_BONUS[def.levelsHandType].chips} chips and +${HAND_LEVEL_BONUS[def.levelsHandType].mult} mult permanently.`,
    flavour: def.flavour,
    cost: def.cost,
    levelsHandType: def.levelsHandType,
    minTargets: 0,
    maxTargets: 0,
  };
}

export function randomArcana(): ConsumableCard {
  const def = ARCANA_DEFS[Math.floor(Math.random() * ARCANA_DEFS.length)];
  return makeArcana(def.defId)!;
}

export function randomCelestial(): ConsumableCard {
  const def = CELESTIAL_DEFS[Math.floor(Math.random() * CELESTIAL_DEFS.length)];
  return makeCelestial(def.defId)!;
}

// ── Shop offerings ────────────────────────────────────────────────────────
export function getShopConsumables(floor: number): ConsumableCard[] {
  const arcanaRarityWeights =
    floor === 1
      ? { common: 60, uncommon: 30, rare: 10 }
      : { common: 40, uncommon: 35, rare: 25 };

  const pickedArcana = weightedSample(ARCANA_DEFS, arcanaRarityWeights, 2);
  const pickedCelestial = weightedSampleCelestial(CELESTIAL_DEFS, floor, 1);

  return [
    ...pickedArcana.map(d => makeArcana(d.defId)!),
    ...pickedCelestial.map(d => makeCelestial(d.defId)!),
  ];
}

function weightedSample<T extends { rarity: string }>(
  pool: T[],
  weights: Record<string, number>,
  count: number,
): T[] {
  const weighted: T[] = [];
  for (const item of pool) {
    const w = weights[item.rarity] ?? 0;
    for (let i = 0; i < w; i++) weighted.push(item);
  }
  const shuffled = [...weighted].sort(() => Math.random() - 0.5);
  const picked: T[] = [];
  const seen = new Set<string>();
  for (const item of shuffled) {
    const key = (item as unknown as { defId: string }).defId;
    if (!seen.has(key)) { picked.push(item); seen.add(key); }
    if (picked.length === count) break;
  }
  return picked;
}

function weightedSampleCelestial(pool: CelestialDefinition[], floor: number, count: number): CelestialDefinition[] {
  const weights = floor === 1
    ? { common: 50, uncommon: 35, rare: 14, legendary: 1 }
    : { common: 30, uncommon: 35, rare: 30, legendary: 5 };
  return weightedSample(pool, weights, count);
}

// ── Effect application ────────────────────────────────────────────────────

function modifyCardEverywhere(player: Player, cardId: string, modify: (c: Card) => Card): Player {
  return {
    ...player,
    hand: player.hand.map(c => c.id === cardId ? modify(c) : c),
    deck: player.deck.map(c => c.id === cardId ? modify(c) : c),
    discardPile: player.discardPile.map(c => c.id === cardId ? modify(c) : c),
  };
}

function removeCardEverywhere(player: Player, cardId: string): Player {
  return {
    ...player,
    hand: player.hand.filter(c => c.id !== cardId),
    deck: player.deck.filter(c => c.id !== cardId),
    discardPile: player.discardPile.filter(c => c.id !== cardId),
  };
}

function changeSuit(suit: Suit) {
  return (state: GameState, playerId: string, targetCardIds: string[]): GameState => {
    let players = state.players;
    for (const cardId of targetCardIds) {
      players = players.map(p =>
        p.id !== playerId ? p : modifyCardEverywhere(p, cardId, c => ({ ...c, suit }))
      );
    }
    return { ...state, players };
  };
}

function addEnhancement(enhancement: Card['enhancement']) {
  return (state: GameState, playerId: string, targetCardIds: string[]): GameState => {
    let players = state.players;
    for (const cardId of targetCardIds) {
      players = players.map(p =>
        p.id !== playerId ? p : modifyCardEverywhere(p, cardId, c => ({ ...c, enhancement }))
      );
    }
    return { ...state, players };
  };
}

type EffectFn = (state: GameState, playerId: string, targetCardIds: string[]) => GameState;

const ARCANA_EFFECTS: Record<string, EffectFn> = {
  'arcana-gem': (state, playerId) => ({
    ...state,
    players: state.players.map(p => p.id === playerId ? { ...p, gold: p.gold + 15 } : p),
    log: [...state.log, 'The Gem: gained 15 gold.'],
  }),

  'arcana-donjon': (state, playerId) => {
    const player = state.players.find(p => p.id === playerId)!;
    const bonus = Math.min(player.gold, 20);
    return {
      ...state,
      players: state.players.map(p => p.id === playerId ? { ...p, gold: p.gold + bonus } : p),
      log: [...state.log, `The Donjon: doubled gold (+${bonus}).`],
    };
  },

  'arcana-vizier': (state, playerId) => {
    const player = state.players.find(p => p.id === playerId)!;
    const allTypes: HandType[] = [
      'high-card', 'pair', 'two-pair', 'three-of-a-kind', 'straight',
      'flush', 'full-house', 'four-of-a-kind', 'straight-flush', 'royal-flush',
    ];
    // Prefer unlevel'd types
    const unleveled = allTypes.filter(ht => !(player.handLevels[ht] ?? 0));
    const pool = unleveled.length ? unleveled : allTypes;
    const target = pool[Math.floor(Math.random() * pool.length)];
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId
          ? { ...p, handLevels: { ...p.handLevels, [target]: (p.handLevels[target] ?? 0) + 1 } }
          : p
      ),
      log: [...state.log, `The Vizier: levelled up ${target.replace(/-/g, ' ')}.`],
    };
  },

  'arcana-jester': (state, playerId) => {
    const player = state.players.find(p => p.id === playerId)!;
    if (player.consumables.length >= 2) {
      return { ...state, log: [...state.log, 'The Jester: consumable slots full.'] };
    }
    const card = randomArcana();
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, consumables: [...p.consumables, card] } : p
      ),
      log: [...state.log, `The Jester: received ${card.name}.`],
    };
  },

  'arcana-fates': (state, playerId) => {
    // Gives a random different arcana — the caller already removes the source card
    const player = state.players.find(p => p.id === playerId)!;
    if (player.consumables.length >= 2) {
      return { ...state, log: [...state.log, 'The Fates: consumable slots full.'] };
    }
    const card = randomArcana();
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, consumables: [...p.consumables, card] } : p
      ),
      log: [...state.log, `The Fates: transformed into ${card.name}.`],
    };
  },

  'arcana-sun': addEnhancement('bonus'),
  'arcana-moon': changeSuit('hearts'),
  'arcana-star': changeSuit('diamonds'),
  'arcana-balance': changeSuit('spades'),
  'arcana-rogue': changeSuit('clubs'),
  'arcana-euryale': addEnhancement('mult'),
  'arcana-knight': addEnhancement('steel'),
  'arcana-throne': addEnhancement('gold'),
  'arcana-comet':  addEnhancement('wild'),

  'arcana-skull': (state, playerId, targetCardIds) => {
    let players = state.players;
    for (const cardId of targetCardIds) {
      players = players.map(p => p.id !== playerId ? p : removeCardEverywhere(p, cardId));
    }
    return { ...state, players, log: [...state.log, 'The Skull: card destroyed.'] };
  },

  'arcana-void': (state, playerId, targetCardIds) => {
    let players = state.players;
    for (const cardId of targetCardIds) {
      players = players.map(p => p.id !== playerId ? p : removeCardEverywhere(p, cardId));
    }
    players = players.map(p => p.id === playerId ? { ...p, gold: p.gold + 3 } : p);
    return { ...state, players, log: [...state.log, 'The Void: card destroyed, gained 3 gold.'] };
  },
};

export function applyConsumableEffect(
  state: GameState,
  playerId: string,
  consumable: ConsumableCard,
  targetCardIds: string[],
): GameState {
  if (consumable.type === 'celestial' && consumable.levelsHandType) {
    const ht = consumable.levelsHandType;
    const newState = {
      ...state,
      players: state.players.map(p =>
        p.id === playerId
          ? { ...p, handLevels: { ...p.handLevels, [ht]: (p.handLevels[ht] ?? 0) + 1 } }
          : p
      ),
      log: [...state.log, `${consumable.name}: ${ht.replace(/-/g, ' ')} levelled up! (+${HAND_LEVEL_BONUS[ht].chips} chips, +${HAND_LEVEL_BONUS[ht].mult} mult per level)`],
    };
    return newState;
  }

  const effect = ARCANA_EFFECTS[consumable.defId];
  if (!effect) return state;

  const logSuffix = targetCardIds.length
    ? ` (${targetCardIds.length} card${targetCardIds.length !== 1 ? 's' : ''} targeted)`
    : '';
  const withEffect = effect(state, playerId, targetCardIds);
  return {
    ...withEffect,
    log: withEffect.log[withEffect.log.length - 1]?.includes(consumable.name)
      ? withEffect.log
      : [...withEffect.log, `${consumable.name} used${logSuffix}.`],
  };
}
