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
    description: '+25 chips every hand',
    rarity: 'common',
    cost: 3,
    trigger: 'always',
    addChips: 25,
  },
  {
    id: 'blood-ruby',
    name: 'Blood Ruby',
    description: '+2 mult for each heart in scoring cards',
    rarity: 'common',
    cost: 4,
    trigger: 'per-suit-card',
    onSuit: 'hearts',
    addMult: 2,
  },
  {
    id: 'iron-grip',
    name: 'Iron Grip',
    description: '+3 mult for three of a kind or better',
    rarity: 'common',
    cost: 4,
    trigger: 'always',
    onHandType: 'three-of-a-kind',
    addMult: 3,
  },
  {
    id: 'silver-spade',
    name: 'Silver Spade',
    description: '+2 mult for each spade in scoring cards',
    rarity: 'common',
    cost: 4,
    trigger: 'per-suit-card',
    onSuit: 'spades',
    addMult: 2,
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
    description: '+5 mult when playing a straight',
    rarity: 'uncommon',
    cost: 6,
    trigger: 'always',
    onHandType: 'straight',
    addMult: 5,
  },
  {
    id: 'golden-horseshoe',
    name: 'Golden Horseshoe',
    description: '+8 chips for each scoring ace',
    rarity: 'uncommon',
    cost: 5,
    trigger: 'per-scoring-card',
    onRank: 'ace',
    addChips: 8,
  },
  {
    id: 'fools-cap',
    name: "Fool's Cap",
    description: '+6 mult for each scoring face card',
    rarity: 'uncommon',
    cost: 6,
    trigger: 'per-scoring-card',
    onRank: 'face',
    addMult: 6,
  },
  {
    id: 'war-drum',
    name: 'War Drum',
    description: '+8 mult for full house',
    rarity: 'uncommon',
    cost: 7,
    trigger: 'always',
    onHandType: 'full-house',
    addMult: 8,
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
    description: '×3 mult for four of a kind or better',
    rarity: 'rare',
    cost: 10,
    trigger: 'always',
    onHandType: 'four-of-a-kind',
    xMult: 3,
  },
  // Legendary
  {
    id: 'mournival',
    name: 'The Mournival',
    description: '×4 mult — but only when playing four of a kind',
    rarity: 'legendary',
    cost: 14,
    trigger: 'always',
    onHandType: 'four-of-a-kind',
    xMult: 4,
  },
];

export function getShopJokers(floor: number, _room: number): JokerDefinition[] {
  const rarityWeights =
    floor === 1
      ? { common: 60, uncommon: 30, rare: 9, legendary: 1 }
      : { common: 40, uncommon: 35, rare: 20, legendary: 5 };

  const weighted: JokerDefinition[] = [];
  for (const j of JOKER_POOL) {
    const w = rarityWeights[j.rarity];
    for (let i = 0; i < w; i++) weighted.push(j);
  }

  const shuffled = [...weighted].sort(() => Math.random() - 0.5);
  const picked: JokerDefinition[] = [];
  const seen = new Set<string>();
  for (const j of shuffled) {
    if (!seen.has(j.id)) {
      picked.push(j);
      seen.add(j.id);
    }
    if (picked.length === 3) break;
  }
  return picked;
}
