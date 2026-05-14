export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type HandType =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush'
  | 'five-of-a-kind'
  | 'flush-house'    // full house where all 5 cards share the same suit
  | 'flush-five';    // five of a kind where all 5 cards share the same suit

export type ClassName = 'Fighter' | 'Rogue' | 'Wizard' | 'Cleric' | 'Ranger' | 'Bard';

// bonus: +30 chips when scoring | mult: +4 mult when scoring
// glass: ×2 mult when scoring, 25% chance to break after | steel: ×1.5 mult per unplayed card in hand
// gold: +3 gold when scoring | wild: counts as any suit
export type CardEnhancement = 'bonus' | 'mult' | 'glass' | 'steel' | 'gold' | 'wild';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  enhancement?: CardEnhancement;
}

export interface JokerDefinition {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  cost: number;
  trigger: JokerTrigger;
  addChips?: number;
  addMult?: number;
  xMult?: number;
  onHandType?: HandType;
  onSuit?: Suit;
  onRank?: 'face' | 'ace' | 'number';
}

export type JokerTrigger =
  | 'always'
  | 'per-scoring-card'
  | 'per-suit-card';

// ── Consumable cards ────────────────────────────────────────────────────────
export type ConsumableType = 'arcana' | 'celestial';

export interface ConsumableCard {
  id: string;           // unique instance id (defId + random suffix)
  defId: string;        // definition id, e.g. 'arcana-skull'
  name: string;
  type: ConsumableType;
  description: string;
  flavour: string;
  cost: number;
  // Celestial only — which hand type it levels up
  levelsHandType?: HandType;
  // Arcana only — how many cards must be targeted from hand
  minTargets: number;
  maxTargets: number;
}

// ── Classes ──────────────────────────────────────────────────────────────────
export interface ClassDefinition {
  name: ClassName;
  description: string;
  flavour: string;
  startingHP: number;
  startingGold: number;
  handBonus: Partial<Record<HandType, { addChips?: number; addMult?: number; xMult?: number }>>;
  suitBonus: Partial<Record<Suit, { addChips?: number; addMult?: number }>>;
  rankBonus: Partial<Record<'face' | 'ace' | 'number', { addChips?: number; addMult?: number }>>;
  passiveLabel: string;
}

// ── Monster ───────────────────────────────────────────────────────────────────
export type AttackAction =
  | { type: 'attack'; damage: number }
  | { type: 'attack-all'; damage: number }
  | { type: 'buff-self'; label: string }
  | { type: 'debuff-player'; label: string };

export interface MonsterDefinition {
  id: string;
  name: string;
  maxHP: number;
  attackPattern: AttackAction[];
  weakness?: HandType;
  immunity?: HandType;
  isBoss: boolean;
  rewardGold: number;
}

// ── Player ───────────────────────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  class: ClassName;
  hp: number;
  maxHP: number;
  gold: number;
  deck: Card[];
  hand: Card[];
  discardPile: Card[];
  selectedCardIds: string[];
  jokers: JokerDefinition[];
  consumables: ConsumableCard[];     // max 2
  handLevels: Partial<Record<HandType, number>>; // extra levels above base (0 = base)
  handsLeft: number;
  discardsLeft: number;
  status: 'picking' | 'ready' | 'dead';
}

// ── Game state ───────────────────────────────────────────────────────────────
export interface MonsterState {
  definition: MonsterDefinition;
  currentHP: number;
  actionIndex: number;
  shieldHP: number;
}

export interface RoundResult {
  playerDamage: { playerId: string; handType: HandType; chips: number; mult: number; damage: number }[];
  totalDamage: number;
  monsterAction: AttackAction;
  damageToPlayers: { playerId: string; damage: number }[];
  goldGained: { playerId: string; amount: number }[];
  brokenCards: string[];
  mournivalTriggered: boolean; // all active players played four of a kind or better
  monsterDied: boolean;
}

export type GamePhase =
  | 'lobby'
  | 'class-select'
  | 'combat'
  | 'round-result'
  | 'shop'
  | 'victory'
  | 'defeat';

export interface GameState {
  id: string;
  phase: GamePhase;
  floor: number;
  room: number;
  players: Player[];
  monster: MonsterState | null;
  lastRoundResult: RoundResult | null;
  shopJokers: JokerDefinition[];
  shopConsumables: ConsumableCard[];
  log: string[];
}

// ── Socket events ────────────────────────────────────────────────────────────
export interface ServerToClientEvents {
  'state': (state: GameState) => void;
  'error': (msg: string) => void;
}

export interface ClientToServerEvents {
  'room:create': (playerName: string, cb: (roomCode: string) => void) => void;
  'room:join': (roomCode: string, playerName: string, cb: (ok: boolean, err?: string) => void) => void;
  'game:select-class': (className: ClassName) => void;
  'game:ready': () => void;
  'game:select-cards': (cardIds: string[]) => void;
  'game:play-hand': () => void;
  'game:discard': () => void;
  'game:buy-joker': (jokerId: string) => void;
  'game:buy-consumable': (consumableId: string) => void;
  'game:use-consumable': (consumableId: string, targetCardIds: string[]) => void;
  'game:end-shop': () => void;
}
