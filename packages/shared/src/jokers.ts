import { JokerDefinition } from './types.js';

export const JOKER_POOL: JokerDefinition[] = [
  // Common
  {
    id: 'lucky-die',
    name: 'Lucky Die',
    description: '+4 mult when playing a pair',
    rarity: 'common',
    cost: 4,
    trigger: 'always',
    onHandType: 'pair',
    addMult: 4,
  },
  {
    id: 'steel-buckler',
    name: 'Steel Buckler',
    description: '+30 chips every hand',
    rarity: 'common',
    cost: 3,
    trigger: 'always',
    addChips: 30,
  },
  {
    id: 'blood-ruby',
    name: 'Blood Ruby',
    description: '+1 mult for each scoring heart',
    rarity: 'common',
    cost: 4,
    trigger: 'per-suit-card',
    onSuit: 'hearts',
    addMult: 1,
  },
  {
    id: 'iron-grip',
    name: 'Iron Grip',
    description: '+4 mult for three of a kind or better',
    rarity: 'common',
    cost: 4,
    trigger: 'always',
    onHandType: 'three-of-a-kind',
    handTypeOrBetter: true,
    addMult: 4,
  },
  {
    id: 'silver-spade',
    name: 'Silver Spade',
    description: '+1 mult for each scoring spade',
    rarity: 'common',
    cost: 4,
    trigger: 'per-suit-card',
    onSuit: 'spades',
    addMult: 1,
  },
  // Uncommon
  {
    id: 'scholars-tome',
    name: "Scholar's Tome",
    description: '×1.5 mult when playing a flush',
    rarity: 'uncommon',
    cost: 6,
    trigger: 'always',
    onHandType: 'flush',
    xMult: 1.5,
  },
  {
    id: 'rogues-blade',
    name: "Rogue's Blade",
    description: '+7 mult when playing a straight',
    rarity: 'uncommon',
    cost: 6,
    trigger: 'always',
    onHandType: 'straight',
    addMult: 7,
  },
  {
    id: 'golden-horseshoe',
    name: 'Golden Horseshoe',
    description: '+15 chips for each scoring ace',
    rarity: 'uncommon',
    cost: 5,
    trigger: 'per-scoring-card',
    onRank: 'ace',
    addChips: 15,
  },
  {
    id: 'fools-cap',
    name: "Fool's Cap",
    description: '+3 mult for each scoring Jack or Queen',
    rarity: 'uncommon',
    cost: 6,
    trigger: 'per-scoring-card',
    onRank: 'face',
    addMult: 3,
  },
  {
    id: 'war-drum',
    name: 'War Drum',
    description: '+10 mult for full house',
    rarity: 'uncommon',
    cost: 7,
    trigger: 'always',
    onHandType: 'full-house',
    addMult: 10,
  },
  // Rare
  {
    id: 'arcane-prism',
    name: 'Arcane Prism',
    description: '×2 mult when playing a flush',
    rarity: 'rare',
    cost: 9,
    trigger: 'always',
    onHandType: 'flush',
    xMult: 2,
  },
  {
    id: 'ancient-crown',
    name: 'Ancient Crown',
    description: '×2 mult for four of a kind or better',
    rarity: 'rare',
    cost: 10,
    trigger: 'always',
    onHandType: 'four-of-a-kind',
    handTypeOrBetter: true,
    xMult: 2,
  },
  {
    id: 'kings-gambit',
    name: "King's Gambit",
    description: '×2 mult for each scoring King',
    rarity: 'rare',
    cost: 10,
    trigger: 'per-scoring-card',
    onRank: 'king',
    xMult: 2,
  },
  // Legendary
  {
    id: 'mournival',
    name: 'The Mournival',
    description: '×4 mult for four of a kind or better',
    rarity: 'legendary',
    cost: 14,
    trigger: 'always',
    onHandType: 'four-of-a-kind',
    handTypeOrBetter: true,
    xMult: 4,
  },
];

export function sampleJokers(floor: number, count: number): JokerDefinition[] {
  const rarityWeights =
    floor === 1
      ? { common: 60, uncommon: 30, rare: 9, legendary: 1 }
      : { common: 40, uncommon: 35, rare: 20, legendary: 5 };

  const weighted: JokerDefinition[] = [];
  for (const j of JOKER_POOL) {
    const w = rarityWeights[j.rarity];
    for (let i = 0; i < w; i++) weighted.push(j);
  }

  const shuffled = [...weighted];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked: JokerDefinition[] = [];
  const seen = new Set<string>();
  for (const j of shuffled) {
    if (!seen.has(j.id)) { picked.push(j); seen.add(j.id); }
    if (picked.length === count) break;
  }
  return picked;
}

/** @deprecated Use sampleJokers directly */
export function getShopJokers(floor: number, _room: number): JokerDefinition[] {
  return sampleJokers(floor, 3);
}
