import { describe, it, expect, beforeEach } from 'vitest';
import {
  makeArcana,
  makeCelestial,
  randomArcana,
  randomCelestial,
  getShopConsumables,
  applyConsumableEffect,
  ARCANA_DEFS,
  CELESTIAL_DEFS,
  HAND_LEVEL_BONUS,
} from '../consumables.js';
import { ConsumableCard } from '../types.js';
import { card, makePlayer, makeCombatState, resetSeq } from './helpers.js';

beforeEach(resetSeq);

// ── HAND_LEVEL_BONUS ──────────────────────────────────────────────────────────

describe('HAND_LEVEL_BONUS', () => {
  it('has a positive chips and mult entry for every hand type', () => {
    const types = [
      'high-card','pair','two-pair','three-of-a-kind','straight','flush',
      'full-house','four-of-a-kind','straight-flush','royal-flush',
      'five-of-a-kind','flush-house','flush-five',
    ] as const;
    for (const t of types) {
      expect(HAND_LEVEL_BONUS[t].chips).toBeGreaterThan(0);
      expect(HAND_LEVEL_BONUS[t].mult).toBeGreaterThan(0);
    }
  });
});

// ── makeArcana ────────────────────────────────────────────────────────────────

describe('makeArcana', () => {
  it('returns null for unknown defId', () => {
    expect(makeArcana('does-not-exist')).toBeNull();
  });

  it('returns correct type, defId, and name', () => {
    const c = makeArcana('arcana-gem')!;
    expect(c.type).toBe('arcana');
    expect(c.defId).toBe('arcana-gem');
    expect(c.name).toBe('The Gem');
  });

  it('generates unique ids on successive calls', () => {
    const a = makeArcana('arcana-gem')!;
    const b = makeArcana('arcana-gem')!;
    expect(a.id).not.toBe(b.id);
  });

  it('produces a valid card for every arcana def', () => {
    for (const def of ARCANA_DEFS) {
      const c = makeArcana(def.defId);
      expect(c).not.toBeNull();
      expect(c!.defId).toBe(def.defId);
    }
  });
});

// ── makeCelestial ─────────────────────────────────────────────────────────────

describe('makeCelestial', () => {
  it('returns null for unknown defId', () => {
    expect(makeCelestial('does-not-exist')).toBeNull();
  });

  it('returns correct type and levelsHandType', () => {
    const c = makeCelestial('celestial-pair')!;
    expect(c.type).toBe('celestial');
    expect(c.levelsHandType).toBe('pair');
  });

  it('generates unique ids on successive calls', () => {
    const a = makeCelestial('celestial-pair')!;
    const b = makeCelestial('celestial-pair')!;
    expect(a.id).not.toBe(b.id);
  });

  it('sets minTargets and maxTargets to 0', () => {
    const c = makeCelestial('celestial-flush')!;
    expect(c.minTargets).toBe(0);
    expect(c.maxTargets).toBe(0);
  });

  it('embeds level bonus chip and mult values in description', () => {
    const c = makeCelestial('celestial-pair')!;
    expect(c.description).toContain(`+${HAND_LEVEL_BONUS['pair'].chips}`);
    expect(c.description).toContain(`+${HAND_LEVEL_BONUS['pair'].mult}`);
  });

  it('produces a valid card for every celestial def', () => {
    for (const def of CELESTIAL_DEFS) {
      const c = makeCelestial(def.defId);
      expect(c).not.toBeNull();
      expect(c!.levelsHandType).toBeDefined();
    }
  });
});

// ── randomArcana / randomCelestial ────────────────────────────────────────────

describe('randomArcana', () => {
  it('returns a valid arcana', () => {
    const c = randomArcana();
    expect(c.type).toBe('arcana');
    expect(ARCANA_DEFS.some(d => d.defId === c.defId)).toBe(true);
  });
});

describe('randomCelestial', () => {
  it('returns a valid celestial', () => {
    const c = randomCelestial();
    expect(c.type).toBe('celestial');
    expect(CELESTIAL_DEFS.some(d => d.defId === c.defId)).toBe(true);
  });
});

// ── getShopConsumables ────────────────────────────────────────────────────────

describe('getShopConsumables', () => {
  it('returns 3 items: 2 arcana + 1 celestial', () => {
    const items = getShopConsumables(1);
    expect(items).toHaveLength(3);
    expect(items.filter(i => i.type === 'arcana')).toHaveLength(2);
    expect(items.filter(i => i.type === 'celestial')).toHaveLength(1);
  });

  it('returns no duplicate defIds', () => {
    const items = getShopConsumables(1);
    const ids = items.map(i => i.defId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('works for floor 2', () => {
    const items = getShopConsumables(2);
    expect(items).toHaveLength(3);
    expect(items.filter(i => i.type === 'arcana')).toHaveLength(2);
    expect(items.filter(i => i.type === 'celestial')).toHaveLength(1);
  });
});

// ── applyConsumableEffect – celestial ─────────────────────────────────────────

describe('applyConsumableEffect – celestial', () => {
  it('levels up the specified hand type from 0 to 1', () => {
    const p = makePlayer({ handLevels: {} });
    const state = makeCombatState([p]);
    const celestial = makeCelestial('celestial-pair')!;
    const newState = applyConsumableEffect(state, p.id, celestial, []);
    const updated = newState.players.find(pl => pl.id === p.id)!;
    expect(updated.handLevels['pair']).toBe(1);
  });

  it('stacks when hand type is already leveled', () => {
    const p = makePlayer({ handLevels: { pair: 1 } });
    const state = makeCombatState([p]);
    const celestial = makeCelestial('celestial-pair')!;
    const newState = applyConsumableEffect(state, p.id, celestial, []);
    const updated = newState.players.find(pl => pl.id === p.id)!;
    expect(updated.handLevels['pair']).toBe(2);
  });

  it('does not affect other players', () => {
    const p1 = makePlayer({ handLevels: {} });
    const p2 = makePlayer({ handLevels: {} });
    const state = makeCombatState([p1, p2]);
    const celestial = makeCelestial('celestial-flush')!;
    const newState = applyConsumableEffect(state, p1.id, celestial, []);
    const other = newState.players.find(pl => pl.id === p2.id)!;
    expect(other.handLevels['flush'] ?? 0).toBe(0);
  });

  it('appends a log entry', () => {
    const p = makePlayer();
    const state = makeCombatState([p]);
    const celestial = makeCelestial('celestial-flush')!;
    const newState = applyConsumableEffect(state, p.id, celestial, []);
    expect(newState.log.some(l => l.includes('flush'))).toBe(true);
  });
});

// ── applyConsumableEffect – arcana-gem ────────────────────────────────────────

describe('applyConsumableEffect – arcana-gem', () => {
  it('adds 15 gold', () => {
    const p = makePlayer({ gold: 5 });
    const state = makeCombatState([p]);
    const gem = makeArcana('arcana-gem')!;
    const newState = applyConsumableEffect(state, p.id, gem, []);
    expect(newState.players.find(pl => pl.id === p.id)!.gold).toBe(20);
  });
});

// ── applyConsumableEffect – arcana-donjon ─────────────────────────────────────

describe('applyConsumableEffect – arcana-donjon', () => {
  it('doubles gold when gold ≤ 20', () => {
    const p = makePlayer({ gold: 10 });
    const state = makeCombatState([p]);
    const donjon = makeArcana('arcana-donjon')!;
    const newState = applyConsumableEffect(state, p.id, donjon, []);
    expect(newState.players.find(pl => pl.id === p.id)!.gold).toBe(20);
  });

  it('caps the bonus at +20 when gold > 20', () => {
    const p = makePlayer({ gold: 50 });
    const state = makeCombatState([p]);
    const donjon = makeArcana('arcana-donjon')!;
    const newState = applyConsumableEffect(state, p.id, donjon, []);
    expect(newState.players.find(pl => pl.id === p.id)!.gold).toBe(70);
  });

  it('does nothing when gold is 0', () => {
    const p = makePlayer({ gold: 0 });
    const state = makeCombatState([p]);
    const donjon = makeArcana('arcana-donjon')!;
    const newState = applyConsumableEffect(state, p.id, donjon, []);
    expect(newState.players.find(pl => pl.id === p.id)!.gold).toBe(0);
  });
});

// ── applyConsumableEffect – arcana-vizier ─────────────────────────────────────

describe('applyConsumableEffect – arcana-vizier', () => {
  it('levels up exactly one hand type', () => {
    const p = makePlayer({ handLevels: {} });
    const state = makeCombatState([p]);
    const vizier = makeArcana('arcana-vizier')!;
    const newState = applyConsumableEffect(state, p.id, vizier, []);
    const updated = newState.players.find(pl => pl.id === p.id)!;
    const total = Object.values(updated.handLevels).reduce((s, v) => s + (v ?? 0), 0);
    expect(total).toBe(1);
  });

  it('falls back to any type when all types are already leveled', () => {
    const handLevels = {
      'high-card': 1, 'pair': 1, 'two-pair': 1, 'three-of-a-kind': 1,
      'straight': 1, 'flush': 1, 'full-house': 1, 'four-of-a-kind': 1,
      'straight-flush': 1, 'royal-flush': 1, 'five-of-a-kind': 1,
      'flush-house': 1, 'flush-five': 1,
    };
    const p = makePlayer({ handLevels });
    const state = makeCombatState([p]);
    const vizier = makeArcana('arcana-vizier')!;
    const newState = applyConsumableEffect(state, p.id, vizier, []);
    const updated = newState.players.find(pl => pl.id === p.id)!;
    const total = Object.values(updated.handLevels).reduce((s, v) => s + (v ?? 0), 0);
    expect(total).toBe(14);
  });
});

// ── applyConsumableEffect – arcana-jester ─────────────────────────────────────

describe('applyConsumableEffect – arcana-jester', () => {
  it('adds one arcana to consumables', () => {
    const p = makePlayer({ consumables: [] });
    const state = makeCombatState([p]);
    const jester = makeArcana('arcana-jester')!;
    const newState = applyConsumableEffect(state, p.id, jester, []);
    const updated = newState.players.find(pl => pl.id === p.id)!;
    expect(updated.consumables).toHaveLength(1);
    expect(updated.consumables[0].type).toBe('arcana');
  });
});

// ── applyConsumableEffect – arcana-fates ──────────────────────────────────────

describe('applyConsumableEffect – arcana-fates', () => {
  it('adds one arcana to consumables', () => {
    const p = makePlayer({ consumables: [] });
    const state = makeCombatState([p]);
    const fates = makeArcana('arcana-fates')!;
    const newState = applyConsumableEffect(state, p.id, fates, []);
    const updated = newState.players.find(pl => pl.id === p.id)!;
    expect(updated.consumables).toHaveLength(1);
    expect(updated.consumables[0].type).toBe('arcana');
  });
});

// ── applyConsumableEffect – suit-changing arcana ──────────────────────────────

describe('applyConsumableEffect – suit-changing arcana', () => {
  it('arcana-moon changes suit to hearts', () => {
    const target = card('A', 'spades');
    const p = makePlayer({ hand: [target], deck: [], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-moon')!, [target.id]
    );
    expect(newState.players.find(pl => pl.id === p.id)!.hand[0].suit).toBe('hearts');
  });

  it('arcana-star changes suit to diamonds', () => {
    const target = card('K', 'clubs');
    const p = makePlayer({ hand: [target], deck: [], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-star')!, [target.id]
    );
    expect(newState.players.find(pl => pl.id === p.id)!.hand[0].suit).toBe('diamonds');
  });

  it('arcana-balance changes suit to spades', () => {
    const target = card('Q', 'hearts');
    const p = makePlayer({ hand: [target], deck: [], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-balance')!, [target.id]
    );
    expect(newState.players.find(pl => pl.id === p.id)!.hand[0].suit).toBe('spades');
  });

  it('arcana-rogue changes suit to clubs', () => {
    const target = card('J', 'diamonds');
    const p = makePlayer({ hand: [target], deck: [], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-rogue')!, [target.id]
    );
    expect(newState.players.find(pl => pl.id === p.id)!.hand[0].suit).toBe('clubs');
  });

  it('changes cards in deck and discardPile too', () => {
    const target = card('A', 'spades');
    const p = makePlayer({ hand: [], deck: [target], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-moon')!, [target.id]
    );
    expect(newState.players.find(pl => pl.id === p.id)!.deck[0].suit).toBe('hearts');
  });

  it('changes multiple targets at once', () => {
    const c1 = card('A', 'spades');
    const c2 = card('K', 'clubs');
    const p = makePlayer({ hand: [c1, c2], deck: [], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-moon')!, [c1.id, c2.id]
    );
    expect(newState.players.find(pl => pl.id === p.id)!.hand.every(c => c.suit === 'hearts')).toBe(true);
  });
});

// ── applyConsumableEffect – enhancement arcana ────────────────────────────────

describe('applyConsumableEffect – enhancement arcana', () => {
  function testEnhancement(defId: string, expected: string) {
    const target = card('A', 'spades');
    const p = makePlayer({ hand: [target], deck: [], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana(defId)!, [target.id]
    );
    const updated = newState.players.find(pl => pl.id === p.id)!.hand[0];
    expect(updated.enhancement).toBe(expected);
  }

  it('arcana-sun adds bonus enhancement', () => testEnhancement('arcana-sun', 'bonus'));
  it('arcana-euryale adds mult enhancement', () => testEnhancement('arcana-euryale', 'mult'));
  it('arcana-knight adds steel enhancement', () => testEnhancement('arcana-knight', 'steel'));
  it('arcana-throne adds gold enhancement', () => testEnhancement('arcana-throne', 'gold'));
  it('arcana-comet adds wild enhancement', () => testEnhancement('arcana-comet', 'wild'));
});

// ── applyConsumableEffect – arcana-skull ──────────────────────────────────────

describe('applyConsumableEffect – arcana-skull', () => {
  it('removes the target card from hand', () => {
    const target = card('A', 'spades');
    const other = card('K', 'hearts');
    const p = makePlayer({ hand: [target, other], deck: [], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-skull')!, [target.id]
    );
    const updated = newState.players.find(pl => pl.id === p.id)!;
    expect(updated.hand).toHaveLength(1);
    expect(updated.hand[0].rank).toBe('K');
  });

  it('removes the target card from deck', () => {
    const target = card('A', 'spades');
    const p = makePlayer({ hand: [], deck: [target], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-skull')!, [target.id]
    );
    expect(newState.players.find(pl => pl.id === p.id)!.deck).toHaveLength(0);
  });

  it('removes the target card from discardPile', () => {
    const target = card('A', 'spades');
    const p = makePlayer({ hand: [], deck: [], discardPile: [target] });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-skull')!, [target.id]
    );
    expect(newState.players.find(pl => pl.id === p.id)!.discardPile).toHaveLength(0);
  });

  it('does not affect other players', () => {
    const target = card('A', 'spades');
    const p1 = makePlayer({ hand: [target], deck: [], discardPile: [] });
    const p2 = makePlayer({ hand: [card('K', 'hearts')], deck: [], discardPile: [] });
    const newState = applyConsumableEffect(
      makeCombatState([p1, p2]), p1.id, makeArcana('arcana-skull')!, [target.id]
    );
    expect(newState.players.find(pl => pl.id === p2.id)!.hand).toHaveLength(1);
  });
});

// ── applyConsumableEffect – arcana-void ───────────────────────────────────────

describe('applyConsumableEffect – arcana-void', () => {
  it('removes the target card and adds 3 gold', () => {
    const target = card('A', 'spades');
    const p = makePlayer({ hand: [target], deck: [], discardPile: [], gold: 5 });
    const newState = applyConsumableEffect(
      makeCombatState([p]), p.id, makeArcana('arcana-void')!, [target.id]
    );
    const updated = newState.players.find(pl => pl.id === p.id)!;
    expect(updated.hand).toHaveLength(0);
    expect(updated.gold).toBe(8);
  });
});

// ── applyConsumableEffect – unknown defId ─────────────────────────────────────

describe('applyConsumableEffect – unknown arcana defId', () => {
  it('returns the state unchanged', () => {
    const p = makePlayer();
    const state = makeCombatState([p]);
    const unknown: ConsumableCard = {
      id: 'x', defId: 'arcana-unknown', name: 'X', type: 'arcana',
      description: '', flavour: '', cost: 0, minTargets: 0, maxTargets: 0,
    };
    const newState = applyConsumableEffect(state, p.id, unknown, []);
    expect(newState).toBe(state);
  });
});
