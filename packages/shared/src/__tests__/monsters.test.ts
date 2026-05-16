import { describe, it, expect } from 'vitest';
import { getMonsterForNode } from '../monsters.js';

describe('getMonsterForNode', () => {
  // ── Boss selection ────────────────────────────────────────────────────────

  it('returns the orc-warchief for floor 1 boss nodes', () => {
    const m = getMonsterForNode(1, 15, false, true);
    expect(m.id).toBe('orc-warchief');
    expect(m.isBoss).toBe(true);
  });

  it('returns the lich for floor 2 boss nodes', () => {
    const m = getMonsterForNode(2, 15, false, true);
    expect(m.id).toBe('lich');
    expect(m.isBoss).toBe(true);
  });

  // ── HP scaling with depth ────────────────────────────────────────────────

  it('HP is higher at deeper nodes than at shallow nodes', () => {
    // depth 0 and 3 both map to goblin (0%3 === 3%3 === 0), so the base is the same
    const shallow = getMonsterForNode(1, 0, false, false);
    const deep    = getMonsterForNode(1, 3, false, false);
    expect(deep.maxHP).toBeGreaterThan(shallow.maxHP);
  });

  it('rewardGold is higher at deeper nodes', () => {
    const shallow = getMonsterForNode(1, 0, false, false);
    const deep    = getMonsterForNode(1, 3, false, false);
    expect(deep.rewardGold).toBeGreaterThan(shallow.rewardGold);
  });

  // ── Elite vs combat ──────────────────────────────────────────────────────

  it('elite has higher HP than combat at the same depth', () => {
    const combat = getMonsterForNode(1, 6, false, false);
    const elite  = getMonsterForNode(1, 6, true,  false);
    expect(elite.maxHP).toBeGreaterThan(combat.maxHP);
  });

  it('elite has higher rewardGold than combat at the same depth', () => {
    const combat = getMonsterForNode(1, 6, false, false);
    const elite  = getMonsterForNode(1, 6, true,  false);
    expect(elite.rewardGold).toBeGreaterThan(combat.rewardGold);
  });

  it('elite name starts with "Elite "', () => {
    const elite = getMonsterForNode(1, 4, true, false);
    expect(elite.name).toMatch(/^Elite /);
  });

  it('combat node name does not start with "Elite"', () => {
    const combat = getMonsterForNode(1, 4, false, false);
    expect(combat.name).not.toMatch(/^Elite/);
  });

  // ── Floor scaling ────────────────────────────────────────────────────────

  it('floor 2 monsters have higher HP than floor 1 at the same depth', () => {
    const f1 = getMonsterForNode(1, 7, false, false);
    const f2 = getMonsterForNode(2, 7, false, false);
    expect(f2.maxHP).toBeGreaterThan(f1.maxHP);
  });

  // ── isBoss invariant ─────────────────────────────────────────────────────

  it('non-boss nodes always produce isBoss=false regardless of depth', () => {
    for (let depth = 0; depth <= 14; depth++) {
      expect(getMonsterForNode(1, depth, false, false).isBoss).toBe(false);
      expect(getMonsterForNode(1, depth, true,  false).isBoss).toBe(false);
    }
  });

  // ── Attack damage scaling ────────────────────────────────────────────────

  it('max attack damage is higher at depth 3 than depth 0 (same base monster)', () => {
    const atDepth = (d: number) => {
      const m = getMonsterForNode(1, d, false, false);
      return Math.max(
        ...m.attackPattern
          .filter(a => a.type === 'attack' || a.type === 'attack-all')
          .map(a => (a as { damage: number }).damage),
      );
    };
    expect(atDepth(3)).toBeGreaterThan(atDepth(0));
  });
});
