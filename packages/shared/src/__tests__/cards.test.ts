import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards, RANK_CHIP_VALUE, isFaceCard, SUITS, RANKS } from '../cards.js';

describe('createDeck', () => {
  it('produces 52 cards', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('contains every rank × suit combination exactly once', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const count = deck.filter(c => c.rank === rank && c.suit === suit).length;
        expect(count, `${rank} of ${suit}`).toBe(1);
      }
    }
  });

  it('prefixes card ids with the given string', () => {
    const deck = createDeck('p1');
    expect(deck.every(c => c.id.startsWith('p1-'))).toBe(true);
  });

  it('uses "card" as the default prefix', () => {
    const deck = createDeck();
    expect(deck.every(c => c.id.startsWith('card-'))).toBe(true);
  });

  it('creates cards without enhancements', () => {
    const deck = createDeck();
    expect(deck.every(c => c.enhancement === undefined)).toBe(true);
  });
});

describe('shuffleDeck', () => {
  it('preserves length', () => {
    const deck = createDeck();
    expect(shuffleDeck(deck)).toHaveLength(52);
  });

  it('contains the same cards as the original', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const original = new Set(deck.map(c => c.id));
    expect(shuffled.every(c => original.has(c.id))).toBe(true);
  });

  it('does not mutate the input array', () => {
    const deck = createDeck();
    const firstId = deck[0].id;
    shuffleDeck(deck);
    expect(deck[0].id).toBe(firstId);
  });
});

describe('dealCards', () => {
  it('deals exactly n cards', () => {
    const deck = createDeck();
    const { dealt } = dealCards(deck, 8);
    expect(dealt).toHaveLength(8);
  });

  it('remaining = deck.length - n', () => {
    const deck = createDeck();
    const { remaining } = dealCards(deck, 8);
    expect(remaining).toHaveLength(44);
  });

  it('dealt + remaining account for every original card', () => {
    const deck = createDeck();
    const { dealt, remaining } = dealCards(deck, 8);
    const ids = new Set([...dealt, ...remaining].map(c => c.id));
    expect(ids.size).toBe(52);
  });

  it('deals from the front of the deck', () => {
    const deck = createDeck();
    const { dealt } = dealCards(deck, 3);
    expect(dealt[0].id).toBe(deck[0].id);
    expect(dealt[2].id).toBe(deck[2].id);
  });

  it('handles n > deck.length gracefully', () => {
    const deck = createDeck();
    const { dealt, remaining } = dealCards(deck, 100);
    expect(dealt).toHaveLength(52);
    expect(remaining).toHaveLength(0);
  });

  it('handles n = 0', () => {
    const deck = createDeck();
    const { dealt, remaining } = dealCards(deck, 0);
    expect(dealt).toHaveLength(0);
    expect(remaining).toHaveLength(52);
  });
});

describe('RANK_CHIP_VALUE', () => {
  it('number cards equal their face value', () => {
    expect(RANK_CHIP_VALUE['2']).toBe(2);
    expect(RANK_CHIP_VALUE['9']).toBe(9);
    expect(RANK_CHIP_VALUE['10']).toBe(10);
  });

  it('face cards are worth 10', () => {
    expect(RANK_CHIP_VALUE['J']).toBe(10);
    expect(RANK_CHIP_VALUE['Q']).toBe(10);
    expect(RANK_CHIP_VALUE['K']).toBe(10);
  });

  it('ace is worth 11', () => {
    expect(RANK_CHIP_VALUE['A']).toBe(11);
  });
});

describe('isFaceCard', () => {
  it('returns true for J, Q, K', () => {
    expect(isFaceCard('J')).toBe(true);
    expect(isFaceCard('Q')).toBe(true);
    expect(isFaceCard('K')).toBe(true);
  });

  it('returns false for numbers and ace', () => {
    expect(isFaceCard('A')).toBe(false);
    expect(isFaceCard('10')).toBe(false);
    expect(isFaceCard('2')).toBe(false);
  });
});
