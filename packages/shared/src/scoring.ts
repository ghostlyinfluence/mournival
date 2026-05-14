import { Card, HandType, JokerDefinition, Player } from './types.js';
import { RANK_CHIP_VALUE, isFaceCard } from './cards.js';
import { HandEvaluation } from './hands.js';
import { CLASS_DEFINITIONS } from './classes.js';

export interface ScoringBreakdown {
  handType: HandType;
  baseChips: number;
  baseMult: number;
  chips: number;
  mult: number;
  damage: number;
  log: string[];
}

export const HAND_BASE: Record<HandType, { chips: number; mult: number }> = {
  'high-card':       { chips: 5,   mult: 1 },
  'pair':            { chips: 10,  mult: 2 },
  'two-pair':        { chips: 20,  mult: 2 },
  'three-of-a-kind': { chips: 30,  mult: 3 },
  'straight':        { chips: 30,  mult: 4 },
  'flush':           { chips: 35,  mult: 4 },
  'full-house':      { chips: 40,  mult: 4 },
  'four-of-a-kind':  { chips: 60,  mult: 7 },
  'straight-flush':  { chips: 100, mult: 8 },
  'royal-flush':     { chips: 100, mult: 8 },
  'five-of-a-kind':  { chips: 120, mult: 12 },
};

export function scoreHand(
  player: Player,
  evaluation: HandEvaluation,
  allPlayers: Player[],
  allHandTypes: HandType[],
): ScoringBreakdown {
  const { handType, scoringCards } = evaluation;
  const classDef = CLASS_DEFINITIONS[player.class];
  const log: string[] = [];

  const base = HAND_BASE[handType];
  let chips = base.chips;
  let mult = base.mult;
  log.push(`${handType}: ${base.chips} chips × ${base.mult} mult`);

  // Add chip value of ALL played cards (not just scoring cards) for chips;
  // class/joker bonuses apply only to scoring cards
  const playedCards = player.hand.filter(c => player.selectedCardIds.includes(c.id));
  for (const card of playedCards) {
    chips += RANK_CHIP_VALUE[card.rank];
  }
  log.push(`Card values: +${playedCards.reduce((s, c) => s + RANK_CHIP_VALUE[c.rank], 0)} chips`);

  // Class hand bonuses
  const handBonus = classDef.handBonus[handType];
  if (handBonus) {
    if (handBonus.addChips) { chips += handBonus.addChips; log.push(`${player.class} hand bonus: +${handBonus.addChips} chips`); }
    if (handBonus.addMult)  { mult  += handBonus.addMult;  log.push(`${player.class} hand bonus: +${handBonus.addMult} mult`); }
    if (handBonus.xMult)    { mult  *= handBonus.xMult;    log.push(`${player.class} hand bonus: ×${handBonus.xMult} mult`); }
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

  // Bard special: +2 mult per other player who played the same hand type
  if (player.class === 'Bard') {
    const matches = allHandTypes.filter(ht => ht === handType).length - 1; // exclude self
    if (matches > 0) {
      mult += matches * 2;
      log.push(`Bard harmony: +${matches * 2} mult (${matches} matching teammates)`);
    }
  }

  // Joker effects
  for (const joker of player.jokers) {
    applyJoker(joker, handType, scoringCards, playedCards, (c, m, xm) => {
      if (c) { chips += c; log.push(`${joker.name}: +${c} chips`); }
      if (m) { mult  += m; log.push(`${joker.name}: +${m} mult`); }
      if (xm) { mult *= xm; log.push(`${joker.name}: ×${xm} mult`); }
    });
  }

  const damage = Math.round(chips * mult);
  return { handType, baseChips: base.chips, baseMult: base.mult, chips, mult, damage, log };
}

function applyJoker(
  joker: JokerDefinition,
  handType: HandType,
  scoringCards: Card[],
  playedCards: Card[],
  apply: (chips?: number, mult?: number, xMult?: number) => void,
) {
  const handMatches = !joker.onHandType || joker.onHandType === handType;

  if (joker.trigger === 'always') {
    if (handMatches) {
      apply(joker.addChips, joker.addMult, joker.xMult);
    }
  }

  if (joker.trigger === 'per-scoring-card') {
    for (const card of scoringCards) {
      if (!joker.onHandType || joker.onHandType === handType) {
        const rankType = card.rank === 'A' ? 'ace' : isFaceCard(card.rank) ? 'face' : 'number';
        const rankMatches = !joker.onRank || joker.onRank === rankType;
        if (rankMatches) apply(joker.addChips, joker.addMult, joker.xMult);
      }
    }
  }

  if (joker.trigger === 'per-suit-card') {
    const cards = joker.onHandType ? (handMatches ? scoringCards : []) : playedCards;
    for (const card of cards) {
      if (!joker.onSuit || card.suit === joker.onSuit) {
        apply(joker.addChips, joker.addMult, joker.xMult);
      }
    }
  }
}
