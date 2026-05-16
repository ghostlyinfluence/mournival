import { Card, GameState, JokerDefinition } from '@mournival/shared';
import { ConsumableCard } from '@mournival/shared';
import { HAND_LABEL, HAND_LEVEL_BONUS } from '@mournival/shared';
import { RANK_CHIP_VALUE, SUIT_SYMBOL } from '@mournival/shared';
import { useGameStore } from '../store/gameStore';
import { ConsumableTray } from './ConsumableTray';

interface Props {
  state: GameState;
  myPlayerId: string;
}

function JokerItem({ joker, gold, onBuy, jokersMax }: {
  joker: JokerDefinition;
  gold: number;
  onBuy: () => void;
  jokersMax: boolean;
}) {
  const canAfford = gold >= joker.cost;
  return (
    <div className="shop-item">
      <h4>{joker.name}</h4>
      <div className={`rarity rarity-${joker.rarity}`}>{joker.rarity}</div>
      <div className="desc">{joker.description}</div>
      <div className="cost">💰 {joker.cost} gold</div>
      <button className="btn-primary" disabled={!canAfford || jokersMax} onClick={onBuy}>
        {jokersMax ? 'Full (5/5)' : !canAfford ? 'Too expensive' : 'Buy'}
      </button>
    </div>
  );
}

function ConsumableItem({ c, gold, onBuy, slotsMax, handLevels }: {
  c: ConsumableCard;
  gold: number;
  onBuy: () => void;
  slotsMax: boolean;
  handLevels: Partial<Record<string, number>>;
}) {
  const canAfford = gold >= c.cost;
  const levelLabel = c.levelsHandType
    ? ` · +${HAND_LEVEL_BONUS[c.levelsHandType].chips} chips +${HAND_LEVEL_BONUS[c.levelsHandType].mult} mult`
    : '';
  const currentLevel = c.levelsHandType ? (handLevels[c.levelsHandType] ?? 0) + 1 : null;
  return (
    <div className={`shop-item shop-consumable shop-${c.type}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{c.type === 'arcana' ? '🎴' : '💠'}</span>
        <h4 style={{ margin: 0 }}>{c.name}</h4>
      </div>
      <div className={`rarity rarity-${c.type === 'arcana' ? 'uncommon' : 'common'}`}>
        {c.type === 'arcana' ? 'Arcana of Fate' : 'Celestial Stone'}
      </div>
      <div className="desc">
        {c.description}{levelLabel}
        {currentLevel !== null && (
          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            {' '}(currently Lv {currentLevel} → Lv {currentLevel + 1})
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8 }}>{c.flavour}</div>
      <div className="cost">💰 {c.cost} gold</div>
      <button className="btn-secondary" disabled={!canAfford || slotsMax} onClick={onBuy}>
        {slotsMax ? 'Full (2/2)' : !canAfford ? 'Too expensive' : 'Buy'}
      </button>
    </div>
  );
}

function PackOpenOverlay({ state, myPlayerId }: { state: GameState; myPlayerId: string }) {
  const { pickFromPack, closePack } = useGameStore();
  const me = state.players.find(p => p.id === myPlayerId);
  const pack = me?.openPack;
  if (!pack) return null;

  const PACK_ICONS: Record<string, string> = { joker: '🃏', arcana: '🎴', celestial: '💠', card: '🂠' };
  const PACK_NAMES: Record<string, string> = {
    joker: 'Joker Pack', arcana: 'Arcana Pack', celestial: 'Celestial Stone Pack', card: 'Card Pack',
  };

  return (
    <div className="overlay" style={{ zIndex: 200 }}>
      <div className="result-panel" style={{ maxWidth: 540 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36 }}>{PACK_ICONS[pack.packType]}</div>
          <h2 style={{ margin: '8px 0 4px' }}>{PACK_NAMES[pack.packType]}</h2>
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            Pick {pack.picksRemaining} item{pack.picksRemaining !== 1 ? 's' : ''} to keep
          </div>
        </div>

        <div className="shop-grid">
          {pack.jokerContents.map(j => (
            <div className="shop-item" key={j.id} style={{ cursor: 'pointer' }}>
              <h4>{j.name}</h4>
              <div className={`rarity rarity-${j.rarity}`}>{j.rarity}</div>
              <div className="desc">{j.description}</div>
              <button
                className="btn-primary"
                disabled={me!.jokers.length >= 5}
                onClick={() => pickFromPack(j.id)}
              >
                {me!.jokers.length >= 5 ? 'Jokers full' : 'Take'}
              </button>
            </div>
          ))}

          {pack.consumableContents.map(c => (
            <div className={`shop-item shop-consumable shop-${c.type}`} key={c.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{c.type === 'arcana' ? '🎴' : '💠'}</span>
                <h4 style={{ margin: 0 }}>{c.name}</h4>
              </div>
              <div className={`rarity rarity-${c.type === 'arcana' ? 'uncommon' : 'common'}`}>
                {c.type === 'arcana' ? 'Arcana of Fate' : 'Celestial Stone'}
              </div>
              <div className="desc">{c.description}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8 }}>{c.flavour}</div>
              <button
                className="btn-secondary"
                disabled={me!.consumables.length >= 2}
                onClick={() => pickFromPack(c.id)}
              >
                {me!.consumables.length >= 2 ? 'Slots full' : 'Take'}
              </button>
            </div>
          ))}

          {pack.cardContents.map(card => (
            <PackCard key={card.id} card={card} onTake={() => pickFromPack(card.id)} />
          ))}
        </div>

        <button className="btn-primary" style={{ marginTop: 16, background: 'var(--bg-mid)', color: 'var(--text-dim)' }} onClick={closePack}>
          Skip
        </button>
      </div>
    </div>
  );
}

function PackCard({ card, onTake }: { card: Card; onTake: () => void }) {
  const ENHANCEMENT_LABELS: Record<string, string> = {
    bonus: '+30 chips', mult: '+4 mult', glass: '×2 mult / 25% break',
    steel: '×1.5 mult (held)', gold: '+3 gold on score', wild: 'wild suit',
  };
  return (
    <div className="shop-item">
      <h4 style={{ fontSize: 20 }}>
        {RANK_CHIP_VALUE[card.rank] !== undefined ? card.rank : card.rank}{' '}
        <span style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'var(--red-light)' : 'var(--text)' }}>
          {SUIT_SYMBOL[card.suit]}
        </span>
      </h4>
      {card.enhancement && (
        <div className="rarity rarity-uncommon">{ENHANCEMENT_LABELS[card.enhancement] ?? card.enhancement}</div>
      )}
      <div className="desc" style={{ fontSize: 12 }}>
        Base chip value: {RANK_CHIP_VALUE[card.rank]}
        {card.enhancement ? ` · ${ENHANCEMENT_LABELS[card.enhancement]}` : ''}
      </div>
      <button className="btn-secondary" onClick={onTake}>Take</button>
    </div>
  );
}

export function Shop({ state, myPlayerId }: Props) {
  const { buyJoker, buyConsumable, buyPack, endShop } = useGameStore();
  const me = state.players.find(p => p.id === myPlayerId);
  if (!me) return null;

  const hasItems = state.shopJokers.length > 0 || state.shopConsumables.length > 0;
  const hasPacks = state.shopPacks.length > 0;

  return (
    <>
      {me.openPack && <PackOpenOverlay state={state} myPlayerId={myPlayerId} />}

      <div className="shop">
        <h2>The Wandering Merchant</h2>
        <p className="shop-subtitle">
          Floor {state.floor} · Room {state.room} · You have{' '}
          <strong style={{ color: 'var(--gold)' }}>{me.gold} gold</strong>
        </p>

        {/* Held consumables */}
        {me.consumables.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--gold)', marginBottom: 10 }}>Your Arcana &amp; Stones</h3>
            <ConsumableTray player={me} inShop />
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
              Click a Stone to use it. Arcana with 0 targets activate immediately; others need targets (use in combat).
            </p>
          </section>
        )}

        {/* Individual items for sale */}
        {hasItems && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--gold)', marginBottom: 10 }}>For Sale</h3>
            <div className="shop-grid">
              {state.shopJokers.map(joker => (
                <JokerItem
                  key={joker.id}
                  joker={joker}
                  gold={me.gold}
                  onBuy={() => buyJoker(joker.id)}
                  jokersMax={me.jokers.length >= 5}
                />
              ))}
              {state.shopConsumables.map(c => (
                <ConsumableItem
                  key={c.id}
                  c={c}
                  gold={me.gold}
                  onBuy={() => buyConsumable(c.id)}
                  slotsMax={me.consumables.length >= 2}
                  handLevels={me.handLevels}
                />
              ))}
            </div>
          </section>
        )}

        {/* Packs */}
        {hasPacks && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--gold)', marginBottom: 10 }}>Packs</h3>
            <div className="shop-grid">
              {state.shopPacks.map(pack => {
                const PACK_ICONS: Record<string, string> = { joker: '🃏', arcana: '🎴', celestial: '💠', card: '🂠' };
                const canAfford = me.gold >= pack.cost;
                const hasOpenPack = !!me.openPack;
                return (
                  <div className="shop-item shop-pack" key={pack.id}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{PACK_ICONS[pack.type]}</div>
                    <h4>{pack.name}</h4>
                    <div className="rarity rarity-common">Pack</div>
                    <div className="desc">{pack.description}</div>
                    <div className="cost">💰 {pack.cost} gold</div>
                    <button
                      className="btn-secondary"
                      disabled={!canAfford || hasOpenPack}
                      onClick={() => buyPack(pack.id)}
                    >
                      {hasOpenPack ? 'Close current pack first' : !canAfford ? 'Too expensive' : 'Open Pack'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Your joker loadout */}
        {me.jokers.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--gold)', marginBottom: 8 }}>
              Your Jokers <span style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 400 }}>({me.jokers.length}/5)</span>
            </h3>
            <div className="shop-grid">
              {me.jokers.map(j => (
                <div className="shop-item" key={j.id}>
                  <h4>{j.name}</h4>
                  <div className={`rarity rarity-${j.rarity}`}>{j.rarity}</div>
                  <div className="desc">{j.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Hand levels summary */}
        {Object.keys(me.handLevels).length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--gold)', marginBottom: 8 }}>Hand Levels</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(Object.entries(me.handLevels) as [string, number][])
                .filter(([, lv]) => lv > 0)
                .map(([ht, lv]) => (
                  <span key={ht} className="joker-badge" style={{ fontSize: 12 }}>
                    {HAND_LABEL[ht as keyof typeof HAND_LABEL]} Lv {lv + 1}
                  </span>
                ))}
            </div>
          </section>
        )}

        <button className="btn-primary" disabled={!!me.openPack} onClick={endShop}>
          {me.openPack ? 'Close pack first' : 'Continue to Next Room →'}
        </button>
      </div>
    </>
  );
}
