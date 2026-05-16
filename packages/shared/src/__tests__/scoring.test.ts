import { describe, it, expect, beforeEach } from 'vitest';
import { scoreHand, getHandBase, HAND_BASE } from '../scoring.js';
import { evaluateHand } from '../hands.js';
import { Player, JokerDefinition } from '../types.js';
import { card, hand, makePlayer, resetSeq } from './helpers.js';

beforeEach(resetSeq);

// ── getHandBase ────────────────────────────────────────────────────────────

describe('getHandBase', () => {
  it('returns the base values when hand level is 0', () => {
    const p = makePlayer({ handLevels: {} });
    const base = getHandBase('pair', p);
    expect(base).toEqual(HAND_BASE['pair']);
  });

  it('adds level bonus for each level above 0', () => {
    const p = makePlayer({ handLevels: { pair: 2 } });
    const base = getHandBase('pair', p);
    expect(base.chips).toBe(HAND_BASE['pair'].chips + 15 * 2);
    expect(base.mult).toBe(HAND_BASE['pair'].mult + 1 * 2);
  });
});

// ── scoreHand – base scoring ───────────────────────────────────────────────

describe('scoreHand – basic', () => {
  it('damage equals chips × mult (rounded)', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','diamonds'],['9','clubs'],['7','spades']);
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards.slice(0,2)); // pair of aces
    const result = scoreHand(p, ev, [p], [ev.handType]);
    expect(result.damage).toBe(Math.round(result.chips * result.mult));
  });

  it('all played cards contribute chip value regardless of scoring status', () => {
    const cards = hand(['A','spades'],['A','hearts'],['2','clubs'],['3','diamonds'],['4','spades']);
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards.slice(0,2));
    const result = scoreHand(p, ev, [p], [ev.handType]);
    // base chips + A(11) + A(11) + 2 + 3 + 4 = base + 31
    expect(result.chips).toBe(result.baseChips + 31);
  });

  it('hand level bonus is applied', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','diamonds'],['9','clubs'],['7','spades']);
    const base = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id), handLevels: {} });
    const leveled = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id), handLevels: { pair: 1 } });
    const ev = evaluateHand(cards.slice(0,2));
    const r1 = scoreHand(base, ev, [base], [ev.handType]);
    const r2 = scoreHand(leveled, ev, [leveled], [ev.handType]);
    expect(r2.chips).toBeGreaterThan(r1.chips);
    expect(r2.mult).toBeGreaterThan(r1.mult);
  });
});

// ── scoreHand – enhancements ───────────────────────────────────────────────

describe('scoreHand – card enhancements', () => {
  it('bonus card adds +30 chips to scoring cards', () => {
    const bonusCard = card('A', 'spades', 'bonus');
    const other = card('A', 'hearts');
    const cards = [bonusCard, other];
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards);
    const base = scoreHand(makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) }), ev, [p], [ev.handType]);
    const withBonus = scoreHand(p, ev, [p], [ev.handType]);
    expect(withBonus.chips).toBe(base.chips); // same player used above
    // More direct: create two players, one with bonus card in scoring
    const plain = [card('A','spades'), card('A','hearts')];
    const pPlain = makePlayer({ hand: plain, selectedCardIds: plain.map(c => c.id) });
    const enhanced = [card('A','spades','bonus'), card('A','hearts')];
    const pEnhanced = makePlayer({ hand: enhanced, selectedCardIds: enhanced.map(c => c.id) });
    const evP = evaluateHand(plain);
    const evE = evaluateHand(enhanced);
    const rP = scoreHand(pPlain, evP, [pPlain], [evP.handType]);
    const rE = scoreHand(pEnhanced, evE, [pEnhanced], [evE.handType]);
    expect(rE.chips - rP.chips).toBe(30);
  });

  it('mult card adds +4 mult to scoring cards', () => {
    const plain = [card('A','spades'), card('A','hearts')];
    const enhanced = [card('A','spades','mult'), card('A','hearts')];
    const pP = makePlayer({ hand: plain, selectedCardIds: plain.map(c => c.id) });
    const pE = makePlayer({ hand: enhanced, selectedCardIds: enhanced.map(c => c.id) });
    const evP = evaluateHand(plain);
    const evE = evaluateHand(enhanced);
    const rP = scoreHand(pP, evP, [pP], [evP.handType]);
    const rE = scoreHand(pE, evE, [pE], [evE.handType]);
    expect(rE.mult - rP.mult).toBe(4);
  });

  it('glass card doubles mult', () => {
    const plain = [card('A','spades'), card('A','hearts')];
    const enhanced = [card('A','spades','glass'), card('A','hearts')];
    const pP = makePlayer({ hand: plain, selectedCardIds: plain.map(c => c.id) });
    const pE = makePlayer({ hand: enhanced, selectedCardIds: enhanced.map(c => c.id) });
    const evP = evaluateHand(plain);
    const evE = evaluateHand(enhanced);
    const rP = scoreHand(pP, evP, [pP], [evP.handType]);
    const rE = scoreHand(pE, evE, [pE], [evE.handType]);
    expect(rE.mult).toBeCloseTo(rP.mult * 2);
  });

  it('steel card in hand (unplayed) multiplies mult by 1.5', () => {
    const played = [card('A','spades'), card('A','hearts')];
    const unplayed = card('K','clubs','steel');
    const allCards = [...played, unplayed];
    const p = makePlayer({ hand: allCards, selectedCardIds: played.map(c => c.id) });
    const ev = evaluateHand(played);

    const pNoSteel = makePlayer({ hand: played, selectedCardIds: played.map(c => c.id) });
    const evNoSteel = evaluateHand(played);

    const rWith = scoreHand(p, ev, [p], [ev.handType]);
    const rWithout = scoreHand(pNoSteel, evNoSteel, [pNoSteel], [evNoSteel.handType]);
    expect(rWith.mult).toBeCloseTo(rWithout.mult * 1.5);
  });

  it('gold card in scoring cards adds to goldFromCards', () => {
    const cards = [card('A','spades','gold'), card('A','hearts')];
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards);
    const result = scoreHand(p, ev, [p], [ev.handType]);
    expect(result.goldFromCards).toBe(3);
  });

  it('two gold cards in scoring add 6 gold total', () => {
    const cards = [card('A','spades','gold'), card('A','hearts','gold')];
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards);
    const result = scoreHand(p, ev, [p], [ev.handType]);
    expect(result.goldFromCards).toBe(6);
  });
});

// ── scoreHand – class bonuses ──────────────────────────────────────────────

describe('scoreHand – class bonuses', () => {
  it('Fighter gets bonus chips per face card in scoring', () => {
    const faceCards = [card('K','spades'), card('K','hearts'), card('K','diamonds')];
    const p = makePlayer({ hand: faceCards, selectedCardIds: faceCards.map(c => c.id), class: 'Fighter' });
    const p2 = makePlayer({ hand: faceCards, selectedCardIds: faceCards.map(c => c.id), class: 'Wizard' });
    const ev = evaluateHand(faceCards);
    const rF = scoreHand(p, ev, [p], [ev.handType]);
    const rW = scoreHand(p2, ev, [p2], [ev.handType]);
    expect(rF.chips).toBeGreaterThan(rW.chips);
  });

  it('Bard gains +2 mult per teammate playing the same hand', () => {
    const bardCards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const mateCards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const bard = makePlayer({ hand: bardCards, selectedCardIds: bardCards.map(c => c.id), class: 'Bard' });
    const mate = makePlayer({ hand: mateCards, selectedCardIds: mateCards.map(c => c.id), class: 'Fighter' });
    const ev = evaluateHand(bardCards.slice(0,2));
    const rSolo = scoreHand(bard, ev, [bard], ['pair']);
    const rDuo  = scoreHand(bard, ev, [bard, mate], ['pair', 'pair']);
    expect(rDuo.mult - rSolo.mult).toBe(2);
  });

  it('Bard gets no harmony bonus when no teammate plays the same hand', () => {
    const bardCards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const bard = makePlayer({ hand: bardCards, selectedCardIds: bardCards.map(c => c.id), class: 'Bard' });
    const mate = makePlayer({ hand: bardCards, selectedCardIds: bardCards.map(c => c.id), class: 'Fighter' });
    const ev = evaluateHand(bardCards.slice(0,2)); // pair
    const rDiff = scoreHand(bard, ev, [bard, mate], ['pair', 'three-of-a-kind']);
    const rSolo = scoreHand(bard, ev, [bard], ['pair']);
    expect(rDiff.mult).toBe(rSolo.mult);
  });
});

// ── scoreHand – joker effects ──────────────────────────────────────────────

const mkJoker = (overrides: Partial<JokerDefinition>): JokerDefinition => ({
  id: 'test', name: 'Test', description: '', rarity: 'common', cost: 0,
  trigger: 'always',
  ...overrides,
});

describe('scoreHand – jokers', () => {
  it('always joker adds chips unconditionally', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const joker = mkJoker({ addChips: 50 });
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id), jokers: [joker] });
    const pNoJoker = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards.slice(0,2));
    const rJ = scoreHand(p, ev, [p], [ev.handType]);
    const rN = scoreHand(pNoJoker, ev, [pNoJoker], [ev.handType]);
    expect(rJ.chips - rN.chips).toBe(50);
  });

  it('always joker with onHandType only fires on matching hand', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const joker = mkJoker({ addMult: 10, onHandType: 'flush' });
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id), jokers: [joker] });
    const pNo = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards.slice(0,2)); // pair — does NOT match flush
    const rJ = scoreHand(p, ev, [p], [ev.handType]);
    const rN = scoreHand(pNo, ev, [pNo], [ev.handType]);
    expect(rJ.mult).toBe(rN.mult);
  });

  it('handTypeOrBetter joker triggers on higher hand', () => {
    const foak = hand(['A','spades'],['A','hearts'],['A','diamonds'],['A','clubs'],['K','spades']);
    const joker = mkJoker({ addMult: 5, onHandType: 'three-of-a-kind', handTypeOrBetter: true });
    const p = makePlayer({ hand: foak, selectedCardIds: foak.map(c => c.id), jokers: [joker] });
    const pNo = makePlayer({ hand: foak, selectedCardIds: foak.map(c => c.id) });
    const ev = evaluateHand(foak);
    expect(ev.handType).toBe('four-of-a-kind');
    const rJ = scoreHand(p, ev, [p], [ev.handType]);
    const rN = scoreHand(pNo, ev, [pNo], [ev.handType]);
    expect(rJ.mult - rN.mult).toBe(5);
  });

  it('handTypeOrBetter joker does NOT trigger on weaker hand', () => {
    const pair = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const joker = mkJoker({ addMult: 5, onHandType: 'four-of-a-kind', handTypeOrBetter: true });
    const p = makePlayer({ hand: pair, selectedCardIds: pair.map(c => c.id), jokers: [joker] });
    const pNo = makePlayer({ hand: pair, selectedCardIds: pair.map(c => c.id) });
    const ev = evaluateHand(pair.slice(0,2));
    const rJ = scoreHand(p, ev, [p], [ev.handType]);
    const rN = scoreHand(pNo, ev, [pNo], [ev.handType]);
    expect(rJ.mult).toBe(rN.mult);
  });

  it('per-scoring-card joker fires once per scoring card', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const joker = mkJoker({ trigger: 'per-scoring-card', addChips: 8, onRank: 'ace' });
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id), jokers: [joker] });
    const pNo = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards.slice(0,2)); // pair of aces — 2 scoring aces
    const rJ = scoreHand(p, ev, [p], [ev.handType]);
    const rN = scoreHand(pNo, ev, [pNo], [ev.handType]);
    expect(rJ.chips - rN.chips).toBe(16); // 8 × 2 aces
  });

  it('per-suit-card joker fires for each matching suit in played cards', () => {
    const cards = hand(['A','hearts'],['K','hearts'],['J','hearts'],['9','clubs'],['7','spades']);
    const joker = mkJoker({ trigger: 'per-suit-card', addMult: 2, onSuit: 'hearts' });
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id), jokers: [joker] });
    const pNo = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards); // flush
    const rJ = scoreHand(p, ev, [p], [ev.handType]);
    const rN = scoreHand(pNo, ev, [pNo], [ev.handType]);
    expect(rJ.mult - rN.mult).toBe(6); // 3 hearts × +2
  });

  it('xMult joker multiplies mult', () => {
    const cards = hand(['A','spades'],['A','hearts'],['K','clubs'],['J','diamonds'],['9','spades']);
    const joker = mkJoker({ xMult: 3 });
    const p = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id), jokers: [joker] });
    const pNo = makePlayer({ hand: cards, selectedCardIds: cards.map(c => c.id) });
    const ev = evaluateHand(cards.slice(0,2));
    const rJ = scoreHand(p, ev, [p], [ev.handType]);
    const rN = scoreHand(pNo, ev, [pNo], [ev.handType]);
    expect(rJ.mult).toBeCloseTo(rN.mult * 3);
  });
});
