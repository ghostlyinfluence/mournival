import { Card, Rank, Suit } from './types.js';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_CHIP_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'A': 11,
};

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};

export const RANK_ORDER: Record<Rank, number> = {
  '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6,
  '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12,
};

export function isFaceCard(rank: Rank): boolean {
  return rank === 'J' || rank === 'Q' || rank === 'K';
}

export function createDeck(prefix = 'card'): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${prefix}-${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function dealCards(deck: Card[], n: number): { dealt: Card[]; remaining: Card[] } {
  return { dealt: deck.slice(0, n), remaining: deck.slice(n) };
}

export function randomPackCards(count: number): Card[] {
  const enhancements: (Card['enhancement'])[] = ['bonus', 'mult', 'glass', 'steel', 'gold', 'wild'];
  const uid = () => Math.random().toString(36).slice(2, 7);
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const enhancement = Math.random() < 0.65
      ? enhancements[Math.floor(Math.random() * enhancements.length)]
      : undefined;
    cards.push({ id: `pack-${suit[0]}${rank}-${uid()}`, suit, rank, enhancement });
  }
  return cards;
}
