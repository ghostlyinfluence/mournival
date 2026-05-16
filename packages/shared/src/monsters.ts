import { MonsterDefinition } from './types.js';

export const MONSTERS: MonsterDefinition[] = [
  // Floor 1
  {
    id: 'goblin',
    name: 'Goblin Scrapper',
    maxHP: 300,
    attackPattern: [
      { type: 'attack', damage: 8 },
      { type: 'attack', damage: 8 },
      { type: 'buff-self', label: 'Frenzy (next attack +4 dmg)', shield: 0 },
      { type: 'attack', damage: 12 },
    ],
    rewardGold: 4,
    isBoss: false,
  },
  {
    id: 'skeleton',
    name: 'Skeleton Archer',
    maxHP: 260,
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
    maxHP: 380,
    attackPattern: [
      { type: 'attack', damage: 5 },
      { type: 'attack', damage: 5 },
      { type: 'debuff-player', label: 'Acid Splash (discard 2 random cards)', discardRandom: 2 },
    ],
    immunity: 'high-card',
    rewardGold: 5,
    isBoss: false,
  },
  // Floor 1 Boss
  {
    id: 'orc-warchief',
    name: 'Orc Warchief',
    maxHP: 1200,
    attackPattern: [
      { type: 'attack', damage: 20 },
      { type: 'attack', damage: 20 },
      { type: 'attack-all', damage: 14 },
      { type: 'buff-self', label: 'Battle Cry (+20 shield)', shield: 20 },
      { type: 'attack', damage: 28 },
    ],
    weakness: 'four-of-a-kind',
    rewardGold: 20,
    isBoss: true,
  },
  // Floor 2
  {
    id: 'vampire',
    name: 'Vampire Noble',
    maxHP: 300,
    attackPattern: [
      { type: 'attack', damage: 12 },
      { type: 'attack', damage: 12 },
      { type: 'debuff-player', label: 'Blood Drain (steal 2 gold)', stealGold: 2 },
      { type: 'attack', damage: 16 },
    ],
    weakness: 'straight',
    rewardGold: 8,
    isBoss: false,
  },
  {
    id: 'golem',
    name: 'Stone Golem',
    maxHP: 360,
    attackPattern: [
      { type: 'attack', damage: 18 },
      { type: 'buff-self', label: 'Stone Skin (+20 shield)', shield: 20 },
      { type: 'attack', damage: 18 },
    ],
    immunity: 'high-card',
    rewardGold: 9,
    isBoss: false,
  },
  {
    id: 'banshee',
    name: 'Wailing Banshee',
    maxHP: 280,
    attackPattern: [
      { type: 'attack-all', damage: 8 },
      { type: 'attack-all', damage: 8 },
      { type: 'debuff-player', label: 'Wail (all players lose 1 hand)', reduceHands: 1 },
    ],
    weakness: 'full-house',
    rewardGold: 8,
    isBoss: false,
  },
  // Floor 2 Boss
  {
    id: 'lich',
    name: 'The Lich',
    maxHP: 3000,
    attackPattern: [
      { type: 'attack', damage: 28 },
      { type: 'attack-all', damage: 20 },
      { type: 'buff-self', label: 'Phylactery (+40 shield)', shield: 40 },
      { type: 'attack', damage: 35 },
      { type: 'debuff-player', label: 'Curse (random player −10 max HP)', reduceMaxHP: 10 },
      { type: 'attack-all', damage: 25 },
    ],
    weakness: 'royal-flush',
    immunity: 'pair',
    rewardGold: 30,
    isBoss: true,
  },
];

function scaleMonster(def: MonsterDefinition, hpFactor: number, attackFactor: number): MonsterDefinition {
  return {
    ...def,
    maxHP: Math.round(def.maxHP * hpFactor),
    attackPattern: def.attackPattern.map(a => {
      if (a.type === 'attack') return { ...a, damage: Math.round(a.damage * attackFactor) };
      if (a.type === 'attack-all') return { ...a, damage: Math.round(a.damage * attackFactor) };
      return a;
    }),
    rewardGold: Math.round(def.rewardGold * hpFactor),
  };
}

const FLOOR1_POOL = ['goblin', 'skeleton', 'slime'] as const;
const FLOOR2_POOL = ['vampire', 'golem', 'banshee'] as const;

/** Select and scale a monster for a map node. depth is the node's row (0–14). */
export function getMonsterForNode(
  floor: number,
  depth: number,
  isElite: boolean,
  isBoss: boolean,
): MonsterDefinition {
  if (isBoss) {
    return floor === 1
      ? MONSTERS.find(m => m.id === 'orc-warchief')!
      : MONSTERS.find(m => m.id === 'lich')!;
  }

  // depth 0 → 1.0×, depth 14 → 2.4×; floor 2 scales HP 2.5× and attacks 1.3×
  const depthFactor = 1.0 + depth * 0.1;
  const eliteFactor = isElite ? 1.5 : 1.0;
  const floorFactor = floor === 1 ? 1.0 : 2.5;
  const hpFactor = depthFactor * eliteFactor * floorFactor;
  const attackFactor = depthFactor * (floor === 1 ? 1.0 : 1.3) * (isElite ? 1.2 : 1.0);

  const pool = floor === 1 ? FLOOR1_POOL : FLOOR2_POOL;
  const baseId = pool[depth % pool.length];
  const base = MONSTERS.find(m => m.id === baseId)!;
  const scaled = scaleMonster(base, hpFactor, attackFactor);

  if (isElite) {
    return { ...scaled, name: `Elite ${scaled.name}`, rewardGold: scaled.rewardGold + 4 };
  }
  return scaled;
}

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
  return MONSTERS[0];
}
