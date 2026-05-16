import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateHand, HAND_LABEL, HAND_RANK } from '../hands.js';
import { card, hand, resetSeq } from './helpers.js';

beforeEach(resetSeq);

// ── Natural hands ──────────────────────────────────────────────────────────

describe('evaluateHand – natural: high card', () => {
  it('identifies high card', () => {
    const h = hand(['A','spades'],['K','hearts'],['J','diamonds'],['9','clubs'],['7','spades']);
    expect(evaluateHand(h).handType).toBe('high-card');
  });
  it('sets highest card as the single scoring card', () => {
    const h = hand(['A','spades'],['K','hearts'],['J','diamonds'],['9','clubs'],['7','spades']);
    const ev = evaluateHand(h);
    expect(ev.scoringCards).toHaveLength(1);
    expect(ev.scoringCards[0].rank).toBe('A');
  });
  it('works with a single card', () => {
    const h = [card('7', 'clubs')];
    expect(evaluateHand(h).handType).toBe('high-card');
  });
  it('returns empty scoring for empty hand', () => {
    const ev = evaluateHand([]);
    expect(ev.handType).toBe('high-card');
    expect(ev.scoringCards).toHaveLength(0);
  });
});

describe('evaluateHand – natural: pair', () => {
  it('identifies pair', () => {
    const h = hand(['A','spades'],['A','hearts'],['K','diamonds'],['9','clubs'],['7','spades']);
    expect(evaluateHand(h).handType).toBe('pair');
  });
  it('scoring cards are the pair', () => {
    const h = hand(['A','spades'],['A','hearts'],['K','diamonds'],['9','clubs'],['7','spades']);
    const ev = evaluateHand(h);
    expect(ev.scoringCards).toHaveLength(2);
    expect(ev.scoringCards.every(c => c.rank === 'A')).toBe(true);
  });
});

describe('evaluateHand – natural: two pair', () => {
  it('identifies two pair', () => {
    const h = hand(['A','spades'],['A','hearts'],['K','diamonds'],['K','clubs'],['7','spades']);
    expect(evaluateHand(h).handType).toBe('two-pair');
  });
  it('scoring cards include both pairs', () => {
    const h = hand(['A','spades'],['A','hearts'],['K','diamonds'],['K','clubs'],['7','spades']);
    expect(evaluateHand(h).scoringCards).toHaveLength(4);
  });
});

describe('evaluateHand – natural: three of a kind', () => {
  it('identifies three of a kind', () => {
    const h = hand(['A','spades'],['A','hearts'],['A','diamonds'],['K','clubs'],['7','spades']);
    expect(evaluateHand(h).handType).toBe('three-of-a-kind');
  });
});

describe('evaluateHand – natural: straight', () => {
  it('identifies a normal straight', () => {
    const h = hand(['5','spades'],['6','hearts'],['7','diamonds'],['8','clubs'],['9','spades']);
    expect(evaluateHand(h).handType).toBe('straight');
  });
  it('identifies the wheel (A-2-3-4-5)', () => {
    const h = hand(['A','spades'],['2','hearts'],['3','diamonds'],['4','clubs'],['5','spades']);
    expect(evaluateHand(h).handType).toBe('straight');
  });
  it('does not accept a non-sequential set as a straight', () => {
    const h = hand(['2','spades'],['4','hearts'],['6','diamonds'],['8','clubs'],['10','spades']);
    expect(evaluateHand(h).handType).toBe('high-card');
  });
});

describe('evaluateHand – natural: flush', () => {
  it('identifies a flush', () => {
    const h = hand(['A','spades'],['K','spades'],['J','spades'],['9','spades'],['7','spades']);
    expect(evaluateHand(h).handType).toBe('flush');
  });
  it('all five cards are scoring cards', () => {
    const h = hand(['A','spades'],['K','spades'],['J','spades'],['9','spades'],['7','spades']);
    expect(evaluateHand(h).scoringCards).toHaveLength(5);
  });
});

describe('evaluateHand – natural: full house', () => {
  it('identifies a full house', () => {
    const h = hand(['A','spades'],['A','hearts'],['A','diamonds'],['K','clubs'],['K','spades']);
    expect(evaluateHand(h).handType).toBe('full-house');
  });
});

describe('evaluateHand – natural: four of a kind', () => {
  it('identifies four of a kind', () => {
    const h = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    expect(evaluateHand(h).handType).toBe('four-of-a-kind');
  });
  it('scoring cards are the quad, kicker is the remainder', () => {
    const h = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    const ev = evaluateHand(h);
    expect(ev.scoringCards).toHaveLength(4);
    expect(ev.kickers).toHaveLength(1);
    expect(ev.kickers[0].rank).toBe('K');
  });
});

describe('evaluateHand – natural: straight flush', () => {
  it('identifies a straight flush', () => {
    const h = hand(['5','spades'],['6','spades'],['7','spades'],['8','spades'],['9','spades']);
    expect(evaluateHand(h).handType).toBe('straight-flush');
  });
});

describe('evaluateHand – natural: royal flush', () => {
  it('identifies a royal flush', () => {
    const h = hand(['10','spades'],['J','spades'],['Q','spades'],['K','spades'],['A','spades']);
    expect(evaluateHand(h).handType).toBe('royal-flush');
  });
});

describe('evaluateHand – natural: five of a kind', () => {
  it('identifies five of a kind (same rank, mixed suits)', () => {
    const h = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['A','spades']);
    expect(evaluateHand(h).handType).toBe('five-of-a-kind');
  });
});

describe('evaluateHand – natural: flush house', () => {
  it('identifies flush house (full house, all same suit)', () => {
    const h = hand(['A','spades'],['A','spades'],['A','spades'],['K','spades'],['K','spades']);
    expect(evaluateHand(h).handType).toBe('flush-house');
  });
  it('full house with mixed suits is NOT flush house', () => {
    const h = hand(['A','spades'],['A','hearts'],['A','diamonds'],['K','clubs'],['K','spades']);
    expect(evaluateHand(h).handType).toBe('full-house');
  });
});

describe('evaluateHand – natural: flush five', () => {
  it('identifies flush five (five of same rank, all same suit)', () => {
    const h = hand(['A','spades'],['A','spades'],['A','spades'],['A','spades'],['A','spades']);
    expect(evaluateHand(h).handType).toBe('flush-five');
  });
  it('five of a kind with mixed suits is NOT flush five', () => {
    const h = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['A','spades']);
    expect(evaluateHand(h).handType).toBe('five-of-a-kind');
  });
});

// ── Wild card hands ────────────────────────────────────────────────────────

describe('evaluateHand – wilds', () => {
  it('all wilds become five of a kind', () => {
    const h = hand(
      ['2','spades','wild'],['3','hearts','wild'],['4','diamonds','wild'],
      ['5','clubs','wild'],['6','spades','wild'],
    );
    expect(evaluateHand(h).handType).toBe('five-of-a-kind');
  });

  it('1 wild + pair → three of a kind', () => {
    const h = hand(['A','spades'],['A','hearts'],['wild' as any,'diamonds','wild'],['K','clubs'],['7','spades']);
    // wild joins the pair → three of a kind
    const ev = evaluateHand(h);
    expect(ev.handType).toBe('three-of-a-kind');
  });

  it('1 wild + three of a kind → four of a kind', () => {
    const h = hand(['K','spades'],['K','hearts'],['K','diamonds'],['2','clubs','wild'],['9','spades']);
    const ev = evaluateHand(h);
    expect(ev.handType).toBe('four-of-a-kind');
  });

  it('1 wild + four of a kind → five of a kind', () => {
    const h = hand(['K','spades'],['K','hearts'],['K','diamonds'],['K','clubs'],['2','spades','wild']);
    expect(evaluateHand(h).handType).toBe('five-of-a-kind');
  });

  it('1 wild + 4 suited cards → flush', () => {
    const h = hand(['A','hearts'],['9','hearts'],['6','hearts'],['3','hearts'],['2','spades','wild']);
    expect(evaluateHand(h).handType).toBe('flush');
  });

  it('1 wild + pair + triplet → full house', () => {
    // wild joins pair to make triplet, or wild joins triplet for four-of-a-kind?
    // greedy: wild joins largest group (triplet) → four-of-a-kind
    const h = hand(['A','spades'],['A','hearts'],['A','diamonds'],['K','clubs'],['K','spades']);
    // This is already full house (no wilds) – add a wild instead of K
    const h2 = hand(['A','spades'],['A','hearts'],['A','diamonds'],['K','clubs'],['2','spades','wild']);
    // greedy: wild joins A triple → four of a kind
    expect(evaluateHand(h2).handType).toBe('four-of-a-kind');
  });

  it('2 wilds + pair → four of a kind', () => {
    const h = hand(['K','spades'],['K','hearts'],['2','diamonds','wild'],['3','clubs','wild'],['9','spades']);
    expect(evaluateHand(h).handType).toBe('four-of-a-kind');
  });

  it('1 wild + all same suit non-wilds → flush-five candidate', () => {
    // All non-wilds share a suit and wild extends the largest rank group to 5
    const h = hand(['A','spades'],['A','spades'],['A','spades'],['A','spades'],['2','spades','wild']);
    expect(evaluateHand(h).handType).toBe('flush-five');
  });

  it('wild with a single non-wild → pair', () => {
    const h = [card('A','spades'), card('2','clubs','wild')];
    expect(evaluateHand(h).handType).toBe('pair');
  });

  it('wild alone → five of a kind (all-wilds path)', () => {
    const h = [card('A','spades','wild')];
    expect(evaluateHand(h).handType).toBe('five-of-a-kind');
  });
});

// ── HAND_LABEL & HAND_RANK ─────────────────────────────────────────────────

describe('HAND_LABEL', () => {
  it('has an entry for every hand type', () => {
    const types = [
      'high-card','pair','two-pair','three-of-a-kind','straight','flush',
      'full-house','four-of-a-kind','straight-flush','royal-flush',
      'five-of-a-kind','flush-house','flush-five',
    ] as const;
    for (const t of types) {
      expect(HAND_LABEL[t]).toBeTruthy();
    }
  });
});

describe('HAND_RANK', () => {
  it('higher hands have higher rank numbers', () => {
    expect(HAND_RANK['flush-five']).toBeGreaterThan(HAND_RANK['royal-flush']);
    expect(HAND_RANK['four-of-a-kind']).toBeGreaterThan(HAND_RANK['full-house']);
    expect(HAND_RANK['pair']).toBeGreaterThan(HAND_RANK['high-card']);
  });
});
