import { MonsterDefinition } from './types.js';

export const MONSTERS: MonsterDefinition[] = [
  // Floor 1
  {
    id: 'goblin',
    name: 'Goblin Scrapper',
    maxHP: 60,
    attackPattern: [
      { type: 'attack', damage: 8 },
      { type: 'attack', damage: 8 },
      { type: 'buff-self', label: 'Frenzy (+4 atk next turn)' },
      { type: 'attack', damage: 12 },
    ],
    rewardGold: 4,
    isBoss: false,
  },
  {
    id: 'skeleton',
    name: 'Skeleton Archer',
    maxHP: 45,
    attackPattern: [
      { type: 'attack', damage: 6 },
      { type: 'attack-all', damage: 4 },
      { type: 'attack', damage: 9 },
    ],
    weakness: 'flush',
    rewardGold: 4,
    isBoss: false,
  },
  {
    id: 'slime',
    name: 'Ooze Cube',
    maxHP: 80,
    attackPattern: [
      { type: 'attack', damage: 5 },
      { type: 'attack', damage: 5 },
      { type: 'debuff-player', label: 'Acid Splash (discard 2 cards next hand)' },
    ],
    immunity: 'high-card',
    rewardGold: 5,
    isBoss: false,
  },
  // Floor 1 Boss
  {
    id: 'orc-warchief',
    name: 'Orc Warchief',
    maxHP: 180,
    attackPattern: [
      { type: 'attack', damage: 14 },
      { type: 'attack', damage: 14 },
      { type: 'attack-all', damage: 10 },
      { type: 'buff-self', label: 'Battle Cry (immune to pairs next round)' },
      { type: 'attack', damage: 20 },
    ],
    weakness: 'four-of-a-kind',
    rewardGold: 12,
    isBoss: true,
  },
  // Floor 2
  {
    id: 'vampire',
    name: 'Vampire Noble',
    maxHP: 100,
    attackPattern: [
      { type: 'attack', damage: 12 },
      { type: 'attack', damage: 12 },
      { type: 'debuff-player', label: 'Blood Drain (steal 2 gold)' },
      { type: 'attack', damage: 16 },
    ],
    weakness: 'straight',
    rewardGold: 8,
    isBoss: false,
  },
  {
    id: 'golem',
    name: 'Stone Golem',
    maxHP: 140,
    attackPattern: [
      { type: 'attack', damage: 18 },
      { type: 'buff-self', label: 'Stone Skin (+20 shield)' },
      { type: 'attack', damage: 18 },
    ],
    immunity: 'high-card',
    rewardGold: 9,
    isBoss: false,
  },
  {
    id: 'banshee',
    name: 'Wailing Banshee',
    maxHP: 90,
    attackPattern: [
      { type: 'attack-all', damage: 8 },
      { type: 'attack-all', damage: 8 },
      { type: 'debuff-player', label: 'Wail (reduce hands left by 1)' },
    ],
    weakness: 'full-house',
    rewardGold: 8,
    isBoss: false,
  },
  // Floor 2 Boss
  {
    id: 'lich',
    name: 'The Lich',
    maxHP: 280,
    attackPattern: [
      { type: 'attack', damage: 18 },
      { type: 'attack-all', damage: 14 },
      { type: 'buff-self', label: 'Phylactery (revive with 40 HP if slain this round)' },
      { type: 'attack', damage: 22 },
      { type: 'debuff-player', label: 'Curse (random player loses 10 max HP)' },
      { type: 'attack-all', damage: 18 },
    ],
    weakness: 'royal-flush',
    immunity: 'pair',
    rewardGold: 20,
    isBoss: true,
  },
];

export function getMonsterForRoom(floor: number, room: number): MonsterDefinition {
  if (floor === 1) {
    if (room === 3) return MONSTERS.find(m => m.id === 'orc-warchief')!;
    return room === 1
      ? MONSTERS.find(m => m.id === 'goblin')!
      : MONSTERS.find(m => m.id === 'skeleton')!;
  }
  if (floor === 2) {
    if (room === 3) return MONSTERS.find(m => m.id === 'lich')!;
    return room === 1
      ? MONSTERS.find(m => m.id === 'vampire')!
      : MONSTERS.find(m => m.id === 'golem')!;
  }
  // Default fallback
  return MONSTERS[0];
}
