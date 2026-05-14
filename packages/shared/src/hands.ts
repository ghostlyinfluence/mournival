import { Card, HandType, Rank } from './types.js';
import { RANK_ORDER } from './cards.js';

export interface HandEvaluation {
  handType: HandType;
  scoringCards: Card[]; // cards that "count" for the hand
  kickers: Card[];
}

function groupByRank(cards: Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  for (const card of cards) {
    const g = groups.get(card.rank) ?? [];
    g.push(card);
    groups.set(card.rank, g);
  }
  return groups;
}

function isFlush(cards: Card[]): boolean {
  return cards.length >= 5 && cards.every(c => c.suit === cards[0].suit);
}

function isStraight(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  const orders = sorted.map(c => RANK_ORDER[c.rank]);
  // Check for A-2-3-4-5 (wheel)
  if (
    orders[4] === RANK_ORDER['A'] &&
    orders[0] === RANK_ORDER['2'] &&
    orders[1] === RANK_ORDER['3'] &&
    orders[2] === RANK_ORDER['4'] &&
    orders[3] === RANK_ORDER['5']
  ) {
    return true;
  }
  for (let i = 1; i < orders.length; i++) {
    if (orders[i] !== orders[i - 1] + 1) return false;
  }
  return true;
}

function isRoyal(cards: Card[]): boolean {
  const ranks = new Set(cards.map(c => c.rank));
  return (
    isFlush(cards) &&
    ranks.has('10') &&
    ranks.has('J') &&
    ranks.has('Q') &&
    ranks.has('K') &&
    ranks.has('A')
  );
}

export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length === 0) {
    return { handType: 'high-card', scoringCards: [], kickers: [] };
  }

  const sorted = [...cards].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
  const rankGroups = groupByRank(cards);
  const groups = [...rankGroups.values()].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return RANK_ORDER[b[0].rank] - RANK_ORDER[a[0].rank];
  });

  const flush = isFlush(cards);
  const straight = isStraight(cards);
  const royal = isRoyal(cards);

  // Five of a kind (special cards only)
  if (groups[0].length === 5) {
    return { handType: 'five-of-a-kind', scoringCards: groups[0], kickers: [] };
  }

  if (royal) {
    return { handType: 'royal-flush', scoringCards: sorted, kickers: [] };
  }

  if (flush && straight) {
    return { handType: 'straight-flush', scoringCards: sorted, kickers: [] };
  }

  if (groups[0].length === 4) {
    const scoring = groups[0];
    const kickers = sorted.filter(c => !scoring.includes(c));
    return { handType: 'four-of-a-kind', scoringCards: scoring, kickers };
  }

  if (groups[0].length === 3 && groups[1]?.length === 2) {
    return { handType: 'full-house', scoringCards: sorted, kickers: [] };
  }

  if (flush) {
    return { handType: 'flush', scoringCards: sorted, kickers: [] };
  }

  if (straight) {
    return { handType: 'straight', scoringCards: sorted, kickers: [] };
  }

  if (groups[0].length === 3) {
    const scoring = groups[0];
    const kickers = sorted.filter(c => !scoring.includes(c));
    return { handType: 'three-of-a-kind', scoringCards: scoring, kickers };
  }

  if (groups[0].length === 2 && groups[1]?.length === 2) {
    const scoring = [...groups[0], ...groups[1]];
    const kickers = sorted.filter(c => !scoring.includes(c));
    return { handType: 'two-pair', scoringCards: scoring, kickers };
  }

  if (groups[0].length === 2) {
    const scoring = groups[0];
    const kickers = sorted.filter(c => !scoring.includes(c));
    return { handType: 'pair', scoringCards: scoring, kickers };
  }

  return { handType: 'high-card', scoringCards: [sorted[0]], kickers: sorted.slice(1) };
}

export const HAND_LABEL: Record<HandType, string> = {
  'high-card': 'High Card',
  'pair': 'Pair',
  'two-pair': 'Two Pair',
  'three-of-a-kind': 'Three of a Kind',
  'straight': 'Straight',
  'flush': 'Flush',
  'full-house': 'Full House',
  'four-of-a-kind': 'Four of a Kind',
  'straight-flush': 'Straight Flush',
  'royal-flush': 'Royal Flush',
  'five-of-a-kind': 'Five of a Kind',
};
