import { Card, HandType, JokerDefinition, Player } from './types.js';
import { RANK_CHIP_VALUE, isFaceCard } from './cards.js';
import { HandEvaluation, HAND_RANK } from './hands.js';
import { CLASS_DEFINITIONS } from './classes.js';
import { HAND_LEVEL_BONUS } from './consumables.js';

export interface ScoringBreakdown {
  handType: HandType;
  baseChips: number;
  baseMult: number;
  chips: number;
  mult: number;
  damage: number;
  goldFromCards: number;  // gold-enhancement cards that scored
  log: string[];
}

export const HAND_BASE: Record<HandType, { chips: number; mult: number }> = {
  'high-card':       { chips: 5,   mult: 1  },
  'pair':            { chips: 10,  mult: 2  },
  'two-pair':        { chips: 20,  mult: 2  },
  'three-of-a-kind': { chips: 30,  mult: 3  },
  'straight':        { chips: 30,  mult: 4  },
  'flush':           { chips: 35,  mult: 4  },
  'full-house':      { chips: 40,  mult: 4  },
  'four-of-a-kind':  { chips: 60,  mult: 7  },
  'straight-flush':  { chips: 100, mult: 8  },
  'royal-flush':     { chips: 100, mult: 8  },
  'five-of-a-kind':  { chips: 120, mult: 12 },
  'flush-house':     { chips: 140, mult: 14 },
  'flush-five':      { chips: 160, mult: 16 },
};

export function getHandBase(handType: HandType, player: Player): { chips: number; mult: number } {
  const base = HAND_BASE[handType];
  const level = player.handLevels[handType] ?? 0;
  if (level === 0) return base;
  const bonus = HAND_LEVEL_BONUS[handType];
  return {
    chips: base.chips + bonus.chips * level,
    mult: base.mult + bonus.mult * level,
  };
}

export function scoreHand(
  player: Player,
  evaluation: HandEvaluation,
  allPlayers: Player[],
  allHandTypes: HandType[],
): ScoringBreakdown {
  const { handType, scoringCards } = evaluation;
  const classDef = CLASS_DEFINITIONS[player.class];
  const log: string[] = [];

  // Base values with hand level bonus applied
  const base = getHandBase(handType, player);
  let chips = base.chips;
  let mult = base.mult;
  const level = player.handLevels[handType] ?? 0;
  log.push(`${handType} (Lv ${level + 1}): ${base.chips} chips × ${base.mult} mult`);

  // All played cards add chip value
  const playedCards = player.hand.filter(c => player.selectedCardIds.includes(c.id));
  let cardValueChips = 0;
  for (const card of playedCards) {
    cardValueChips += RANK_CHIP_VALUE[card.rank];
  }
  chips += cardValueChips;
  log.push(`Card values: +${cardValueChips} chips`);

  // Steel cards held in hand but NOT played → ×1.5 mult each
  const unplayedHand = player.hand.filter(c => !player.selectedCardIds.includes(c.id));
  let steelCount = 0;
  for (const card of unplayedHand) {
    if (card.enhancement === 'steel') {
      mult *= 1.5;
      steelCount++;
    }
  }
  if (steelCount > 0) log.push(`Steel (${steelCount} cards): ×1.5 mult each`);

  // Card enhancements on scoring cards
  let goldFromCards = 0;
  for (const card of scoringCards) {
    if (card.enhancement === 'bonus') {
      chips += 30;
      log.push(`${card.rank} (Bonus): +30 chips`);
    }
    if (card.enhancement === 'mult') {
      mult += 4;
      log.push(`${card.rank} (Mult): +4 mult`);
    }
    if (card.enhancement === 'glass') {
      mult *= 2;
      log.push(`${card.rank} (Glass): ×2 mult`);
    }
    if (card.enhancement === 'gold') {
      goldFromCards += 3;
    }
  }

  // Class hand bonuses
  const handBonus = classDef.handBonus[handType];
  if (handBonus) {
    if (handBonus.addChips) { chips += handBonus.addChips; log.push(`${player.class}: +${handBonus.addChips} chips`); }
    if (handBonus.addMult)  { mult  += handBonus.addMult;  log.push(`${player.class}: +${handBonus.addMult} mult`); }
    if (handBonus.xMult)    { mult  *= handBonus.xMult;    log.push(`${player.class}: ×${handBonus.xMult} mult`); }
  }

  // Class per-scoring-card bonuses
  for (const card of scoringCards) {
    const suitBonus = classDef.suitBonus[card.suit];
    if (suitBonus) {
      if (suitBonus.addChips) { chips += suitBonus.addChips; }
      if (suitBonus.addMult)  { mult  += suitBonus.addMult;  }
    }
    const rankType = card.rank === 'A' ? 'ace' : isFaceCard(card.rank) ? 'face' : 'number';
    const rankBonus = classDef.rankBonus[rankType];
    if (rankBonus) {
      if (rankBonus.addChips) { chips += rankBonus.addChips; }
      if (rankBonus.addMult)  { mult  += rankBonus.addMult;  }
    }
  }

  // Bard: +2 mult per teammate playing same hand type
  if (player.class === 'Bard') {
    const matches = allHandTypes.filter(ht => ht === handType).length - 1;
    if (matches > 0) {
      mult += matches * 2;
      log.push(`Bard harmony: +${matches * 2} mult (${matches} matching teammates)`);
    }
  }

  // Joker effects
  for (const joker of player.jokers) {
    applyJoker(joker, handType, scoringCards, playedCards, (c, m, xm) => {
      if (c)  { chips += c;  log.push(`${joker.name}: +${c} chips`); }
      if (m)  { mult  += m;  log.push(`${joker.name}: +${m} mult`); }
      if (xm) { mult  *= xm; log.push(`${joker.name}: ×${xm} mult`); }
    });
  }

  const damage = Math.round(chips * mult);
  return { handType, baseChips: base.chips, baseMult: base.mult, chips, mult, damage, goldFromCards, log };
}

function applyJoker(
  joker: JokerDefinition,
  handType: HandType,
  scoringCards: Card[],
  playedCards: Card[],
  apply: (chips?: number, mult?: number, xMult?: number) => void,
) {
  const handMatches = !joker.onHandType || (
    joker.handTypeOrBetter
      ? HAND_RANK[handType] >= HAND_RANK[joker.onHandType]
      : joker.onHandType === handType
  );

  if (joker.trigger === 'always' && handMatches) {
    apply(joker.addChips, joker.addMult, joker.xMult);
  }

  if (joker.trigger === 'per-scoring-card') {
    for (const card of scoringCards) {
      if (handMatches) {
        const rankType = card.rank === 'A' ? 'ace' : card.rank === 'K' ? 'king' : isFaceCard(card.rank) ? 'face' : 'number';
        if (!joker.onRank || joker.onRank === rankType) apply(joker.addChips, joker.addMult, joker.xMult);
      }
    }
  }

  if (joker.trigger === 'per-suit-card') {
    const cards = joker.onHandType ? (handMatches ? scoringCards : []) : playedCards;
    for (const card of cards) {
      if (!joker.onSuit || card.suit === joker.onSuit) apply(joker.addChips, joker.addMult, joker.xMult);
    }
  }
}
