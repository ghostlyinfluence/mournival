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
  | 'five-of-a-kind';

export type ClassName = 'Fighter' | 'Rogue' | 'Wizard' | 'Cleric' | 'Ranger' | 'Bard';

export type CardEnhancement = 'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold';

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
  // Data-driven effect — no functions so it serializes cleanly over the wire
  trigger: JokerTrigger;
  addChips?: number;
  addMult?: number;
  xMult?: number;
  // Optional condition filter
  onHandType?: HandType;
  onSuit?: Suit;
  onRank?: 'face' | 'ace' | 'number';
}

export type JokerTrigger =
  | 'always'          // applied once when hand is played
  | 'per-scoring-card' // applied once per scoring card
  | 'per-suit-card';  // applied once per card of `onSuit`

export interface ClassDefinition {
  name: ClassName;
  description: string;
  flavour: string;
  startingHP: number;
  startingGold: number;
  // Passive scoring bonuses applied during hand resolution
  handBonus: Partial<Record<HandType, { addChips?: number; addMult?: number; xMult?: number }>>;
  suitBonus: Partial<Record<Suit, { addChips?: number; addMult?: number }>>;
  rankBonus: Partial<Record<'face' | 'ace' | 'number', { addChips?: number; addMult?: number }>>;
  // Special passive description (some effects are handled in gameLogic)
  passiveLabel: string;
}

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
  weakness?: HandType;   // takes +50% damage
  immunity?: HandType;   // takes 0 damage
  isBoss: boolean;
  rewardGold: number;
}

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
  handsLeft: number;
  discardsLeft: number;
  status: 'picking' | 'ready' | 'dead';
}

export interface MonsterState {
  definition: MonsterDefinition;
  currentHP: number;
  actionIndex: number;
  shieldHP: number; // for buff-self actions
}

export interface RoundResult {
  playerDamage: { playerId: string; handType: HandType; chips: number; mult: number; damage: number }[];
  totalDamage: number;
  monsterAction: AttackAction;
  damageToPlayers: { playerId: string; damage: number }[];
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
  log: string[];
}

// Socket event payloads
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
  'game:end-shop': () => void;
}
