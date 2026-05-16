import { Card, CardEnhancement, GameState, MonsterState, Player, Rank, Suit } from '../types.js';
import { initPlayer, createGameState } from '../gameLogic.js';
import { getMonsterForRoom } from '../monsters.js';

let _seq = 0;
export function resetSeq() { _seq = 0; }

export function card(rank: Rank, suit: Suit, enhancement?: CardEnhancement): Card {
  return { id: `c${++_seq}-${rank}${suit[0]}`, rank, suit, enhancement };
}

export function hand(...specs: [Rank, Suit, CardEnhancement?][]): Card[] {
  return specs.map(([r, s, e]) => card(r, s, e));
}

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return { ...initPlayer(`sock-${++_seq}`, 'Tester'), ...overrides };
}

export function makeCombatState(
  players: Player[],
  monsterId = 'goblin',
  floor = 1,
  room = 1,
): GameState {
  const def = getMonsterForRoom(floor, room);
  const monster: MonsterState = {
    definition: { ...def, id: monsterId },
    currentHP: def.maxHP,
    actionIndex: 0,
    shieldHP: 0,
  };
  return {
    id: 'test',
    phase: 'combat',
    floor,
    room,
    players,
    monster,
    lastRoundResult: null,
    shopJokers: [],
    shopConsumables: [],
    shopPacks: [],
    floorMap: null,
    log: [],
  };
}

/** Build a player whose hand contains exactly the given cards and all are selected. */
export function playerWithHand(cards: Card[], overrides: Partial<Player> = {}): Player {
  const base = makePlayer(overrides);
  return {
    ...base,
    hand: cards,
    selectedCardIds: cards.map(c => c.id),
    deck: [],
    discardPile: [],
  };
}

export { createGameState };
