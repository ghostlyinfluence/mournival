import { ClassDefinition, ClassName } from './types.js';

export const CLASS_DEFINITIONS: Record<ClassName, ClassDefinition> = {
  Fighter: {
    name: 'Fighter',
    description: 'Face cards deal bonus damage. Powerhouse hands hit harder.',
    flavour: '"I don\'t need magic. I have knuckles."',
    startingHP: 50,
    startingGold: 3,
    handBonus: {
      'four-of-a-kind': { addMult: 3 },
      'full-house': { addMult: 2 },
    },
    suitBonus: {},
    rankBonus: {
      face: { addChips: 20 },
    },
    passiveLabel: 'Face cards +20 chips; Four of a Kind +3 mult, Full House +2 mult',
  },
  Rogue: {
    name: 'Rogue',
    description: 'Clubs strike true. Straights and pairs reward patience.',
    flavour: '"Every mark thinks they\'re watching the right hand."',
    startingHP: 36,
    startingGold: 5,
    handBonus: {
      straight: { addMult: 3 },
      pair: { addMult: 1 },
      'two-pair': { addMult: 2 },
    },
    suitBonus: {
      clubs: { addMult: 1 },
    },
    rankBonus: {},
    passiveLabel: 'Each ♣ scoring card +1 mult; Straight +3 mult',
  },
  Wizard: {
    name: 'Wizard',
    description: 'Flushes channel arcane power. Spades resonate with dark magic.',
    flavour: '"The cards are just a focus. The power was always mine."',
    startingHP: 32,
    startingGold: 4,
    handBonus: {
      flush: { xMult: 2 },
      'straight-flush': { xMult: 3 },
      'royal-flush': { xMult: 4 },
    },
    suitBonus: {
      spades: { addMult: 1 },
    },
    rankBonus: {
      ace: { addChips: 15 },
    },
    passiveLabel: 'Flush ×2 mult; each ♠ scoring card +1 mult; Aces +15 chips',
  },
  Cleric: {
    name: 'Cleric',
    description: 'Full houses and pairs restore the party\'s vitality. Hearts heal.',
    flavour: '"Divine light flows through every hand I deal."',
    startingHP: 44,
    startingGold: 3,
    handBonus: {
      'full-house': { addChips: 30, addMult: 1 },
      pair: { addChips: 10 },
    },
    suitBonus: {
      hearts: { addChips: 5 },
    },
    rankBonus: {},
    passiveLabel: 'Full House +30 chips +1 mult, heals 5 HP; Pair heals 2 HP; ♥ +5 chips',
  },
  Ranger: {
    name: 'Ranger',
    description: 'Straights reward precise sequencing. Diamonds sharpen the eye.',
    flavour: '"Five steps ahead. Always."',
    startingHP: 38,
    startingGold: 4,
    handBonus: {
      straight: { addChips: 20, addMult: 4 },
      'straight-flush': { addMult: 6 },
    },
    suitBonus: {
      diamonds: { addChips: 3 },
    },
    rankBonus: {},
    passiveLabel: 'Straight +20 chips +4 mult; each ♦ scoring card +3 chips',
  },
  Bard: {
    name: 'Bard',
    description: 'Playing the same hand as a teammate grants bonus mult. Harmony in chaos.',
    flavour: '"Solo shows are fine. But the band makes it magic."',
    startingHP: 36,
    startingGold: 6,
    handBonus: {},
    suitBonus: {},
    rankBonus: {},
    passiveLabel: '+2 mult per teammate who played the same hand type this round',
  },
};
