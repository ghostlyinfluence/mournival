import { Card, HandType, Rank, Suit } from './types.js';
import { RANK_ORDER } from './cards.js';

export interface HandEvaluation {
  handType: HandType;
  scoringCards: Card[];
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

function groupBySuit(cards: Card[]): Map<Suit, Card[]> {
  const groups = new Map<Suit, Card[]>();
  for (const card of cards) {
    const g = groups.get(card.suit) ?? [];
    g.push(card);
    groups.set(card.suit, g);
  }
  return groups;
}

function sortedGroups(cards: Card[]): Card[][] {
  return [...groupByRank(cards).values()].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return RANK_ORDER[b[0].rank] - RANK_ORDER[a[0].rank];
  });
}

function isFlush(cards: Card[]): boolean {
  return cards.length >= 5 && cards.every(c => c.suit === cards[0].suit);
}

function isStraight(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  const orders = sorted.map(c => RANK_ORDER[c.rank]);
  // A-2-3-4-5 wheel
  if (orders[4] === RANK_ORDER['A'] && orders[0] === RANK_ORDER['2'] &&
      orders[1] === RANK_ORDER['3'] && orders[2] === RANK_ORDER['4'] && orders[3] === RANK_ORDER['5']) {
    return true;
  }
  for (let i = 1; i < orders.length; i++) {
    if (orders[i] !== orders[i - 1] + 1) return false;
  }
  return true;
}

function isRoyal(cards: Card[]): boolean {
  const ranks = new Set(cards.map(c => c.rank));
  return isFlush(cards) && ranks.has('10') && ranks.has('J') && ranks.has('Q') && ranks.has('K') && ranks.has('A');
}

// ── Natural evaluation (no wilds) ─────────────────────────────────────────
function evaluateNatural(cards: Card[]): HandEvaluation {
  const sorted = [...cards].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
  const groups = sortedGroups(cards);
  const flush = isFlush(cards);
  const straight = isStraight(cards);

  // Flush Five: 5 of same rank + all same suit
  if (groups[0].length === 5 && flush) {
    return { handType: 'flush-five', scoringCards: groups[0], kickers: [] };
  }
  // Five of a Kind: 5 same rank (needs wild enhancement, handled separately, but kept here as fallback)
  if (groups[0].length === 5) {
    return { handType: 'five-of-a-kind', scoringCards: groups[0], kickers: [] };
  }

  if (isRoyal(cards)) {
    return { handType: 'royal-flush', scoringCards: sorted, kickers: [] };
  }
  if (flush && straight) {
    return { handType: 'straight-flush', scoringCards: sorted, kickers: [] };
  }
  if (groups[0].length === 4) {
    const scoring = groups[0];
    return { handType: 'four-of-a-kind', scoringCards: scoring, kickers: sorted.filter(c => !scoring.includes(c)) };
  }
  // Flush House: full house where all 5 cards share one suit
  if (groups[0].length === 3 && groups[1]?.length === 2 && flush) {
    return { handType: 'flush-house', scoringCards: sorted, kickers: [] };
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
    return { handType: 'three-of-a-kind', scoringCards: scoring, kickers: sorted.filter(c => !scoring.includes(c)) };
  }
  if (groups[0].length === 2 && groups[1]?.length === 2) {
    const scoring = [...groups[0], ...groups[1]];
    return { handType: 'two-pair', scoringCards: scoring, kickers: sorted.filter(c => !scoring.includes(c)) };
  }
  if (groups[0].length === 2) {
    const scoring = groups[0];
    return { handType: 'pair', scoringCards: scoring, kickers: sorted.filter(c => !scoring.includes(c)) };
  }
  return { handType: 'high-card', scoringCards: [sorted[0]], kickers: sorted.slice(1) };
}

// ── Wild card evaluation ───────────────────────────────────────────────────
// Strategy: greedy — add wilds to the largest existing rank group first.
// Wild cards do not complete straights (too complex; noted as a limitation).
function evaluateWithWilds(nonWilds: Card[], wilds: Card[], allCards: Card[]): HandEvaluation {
  const n = wilds.length;

  if (n === allCards.length) {
    // All wilds — best achievable without suit constraints
    return { handType: 'five-of-a-kind', scoringCards: allCards.slice(0, 5), kickers: [] };
  }

  const sorted = [...nonWilds].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
  const groups = sortedGroups(nonWilds);
  const g0 = groups[0]?.length ?? 0;
  const g1 = groups[1]?.length ?? 0;

  // Best suit group for flush assessment
  const suitGroups = groupBySuit(nonWilds);
  const [bestSuitCards] = [...suitGroups.values()].sort((a, b) => b.length - a.length);
  const bestSuitSize = bestSuitCards?.length ?? 0;

  // Flush Five: 5 same rank + same suit
  if (g0 + n >= 5 && nonWilds.every(c => c.suit === nonWilds[0]?.suit)) {
    const scoring = [...groups[0], ...wilds].slice(0, 5);
    return { handType: 'flush-five', scoringCards: scoring, kickers: [] };
  }

  // Five of a Kind: 5 same rank
  if (g0 + n >= 5) {
    const scoring = [...groups[0], ...wilds].slice(0, 5);
    return { handType: 'five-of-a-kind', scoringCards: scoring, kickers: [] };
  }

  // Four of a Kind
  if (g0 + n >= 4) {
    const wildsUsed = Math.max(0, 4 - g0);
    const scoring = [...groups[0], ...wilds.slice(0, wildsUsed)];
    return { handType: 'four-of-a-kind', scoringCards: scoring, kickers: allCards.filter(c => !scoring.includes(c)) };
  }

  // Flush House: 3+2 all same suit — only if wild can complete both the group and the flush
  // (needs: non-wilds already have a triplet group and all same suit, or close enough)
  // Simplified: check if flush + full-house both achievable with wilds
  if (bestSuitSize + n >= 5 && g0 + n >= 3 && g1 + Math.max(0, n - Math.max(0, 3 - g0)) >= 2) {
    const wildsForTrip = Math.max(0, 3 - g0);
    const remainWilds = n - wildsForTrip;
    const flushCardsNeeded = 5 - bestSuitSize;
    if (flushCardsNeeded <= n && g1 + remainWilds >= 2) {
      // Both conditions met — flush house
      const tripScoring = [...groups[0], ...wilds.slice(0, wildsForTrip)];
      const pairScoring = [...(groups[1] ?? []), ...wilds.slice(wildsForTrip, wildsForTrip + Math.max(0, 2 - g1))];
      if (pairScoring.length >= 2) {
        return { handType: 'flush-house', scoringCards: [...tripScoring, ...pairScoring].slice(0, 5), kickers: [] };
      }
    }
  }

  // Flush (wilds count as any suit to extend the best suit group)
  if (bestSuitSize + n >= 5) {
    const flushWilds = wilds.slice(0, 5 - bestSuitSize);
    const scoring = [...bestSuitCards, ...flushWilds].slice(0, 5);
    return { handType: 'flush', scoringCards: scoring, kickers: allCards.filter(c => !scoring.includes(c)) };
  }

  // Full House: 3 + 2 from rank groups + wilds
  if (g0 + n >= 3) {
    const wildsForTrip = Math.max(0, 3 - g0);
    const remainWilds = n - wildsForTrip;
    const tripCards = [...groups[0], ...wilds.slice(0, wildsForTrip)];
    if (g1 + remainWilds >= 2) {
      const wildsForPair = Math.max(0, 2 - g1);
      const pairCards = [...(groups[1] ?? []), ...wilds.slice(wildsForTrip, wildsForTrip + wildsForPair)];
      if (pairCards.length >= 2) {
        return { handType: 'full-house', scoringCards: [...tripCards, ...pairCards].slice(0, 5), kickers: [] };
      }
    }
    return { handType: 'three-of-a-kind', scoringCards: tripCards, kickers: allCards.filter(c => !tripCards.includes(c)) };
  }

  // Two Pair
  if (g0 >= 2 && g1 + Math.max(0, n) >= 2) {
    const first = groups[0];
    if (g1 >= 2) {
      const second = groups[1];
      return { handType: 'two-pair', scoringCards: [...first, ...second], kickers: allCards.filter(c => !first.includes(c) && !second.includes(c)) };
    }
    if (n >= 2) {
      const second = wilds.slice(0, 2);
      return { handType: 'two-pair', scoringCards: [...first, ...second], kickers: allCards.filter(c => !first.includes(c) && !second.includes(c)) };
    }
  }

  // Pair
  if (g0 + n >= 2) {
    const wildsUsed = Math.max(0, 2 - g0);
    const scoring = [...(groups[0] ?? []), ...wilds.slice(0, wildsUsed)];
    return { handType: 'pair', scoringCards: scoring, kickers: allCards.filter(c => !scoring.includes(c)) };
  }

  return { handType: 'high-card', scoringCards: [sorted[0] ?? wilds[0]], kickers: sorted.slice(1) };
}

// ── Public API ────────────────────────────────────────────────────────────
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length === 0) return { handType: 'high-card', scoringCards: [], kickers: [] };

  const wilds = cards.filter(c => c.enhancement === 'wild');
  const nonWilds = cards.filter(c => c.enhancement !== 'wild');

  if (wilds.length > 0) return evaluateWithWilds(nonWilds, wilds, cards);
  return evaluateNatural(cards);
}

export const HAND_RANK: Record<HandType, number> = {
  'high-card':       0,
  'pair':            1,
  'two-pair':        2,
  'three-of-a-kind': 3,
  'straight':        4,
  'flush':           5,
  'full-house':      6,
  'four-of-a-kind':  7,
  'straight-flush':  8,
  'royal-flush':     9,
  'five-of-a-kind':  10,
  'flush-house':     11,
  'flush-five':      12,
};

export const HAND_LABEL: Record<HandType, string> = {
  'high-card':       'High Card',
  'pair':            'Pair',
  'two-pair':        'Two Pair',
  'three-of-a-kind': 'Three of a Kind',
  'straight':        'Straight',
  'flush':           'Flush',
  'full-house':      'Full House',
  'four-of-a-kind':  'Four of a Kind',
  'straight-flush':  'Straight Flush',
  'royal-flush':     'Royal Flush',
  'five-of-a-kind':  'Five of a Kind',
  'flush-house':     'Flush House',
  'flush-five':      'Flush Five',
};
