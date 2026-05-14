import { GameState } from '@mournival/shared';
import { HAND_LABEL, HAND_LEVEL_BONUS } from '@mournival/shared';
import { useGameStore } from '../store/gameStore';
import { ConsumableTray } from './ConsumableTray';

interface Props {
  state: GameState;
  myPlayerId: string;
}

export function Shop({ state, myPlayerId }: Props) {
  const { buyJoker, buyConsumable, endShop } = useGameStore();
  const me = state.players.find(p => p.id === myPlayerId);
  if (!me) return null;

  return (
    <div className="shop">
      <h2>The Wandering Merchant</h2>
      <p className="shop-subtitle">
        Floor {state.floor} · Room {state.room} · You have{' '}
        <strong style={{ color: 'var(--gold)' }}>{me.gold} gold</strong>
      </p>

      {/* Held consumables (can be used here too) */}
      {me.consumables.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: 10 }}>Your Arcana &amp; Stones</h3>
          <ConsumableTray player={me} inShop />
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            Click a Stone to use it. Arcana with 0 targets activate immediately; others need targets (use in combat).
          </p>
        </section>
      )}

      {/* Jokers for sale */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ color: 'var(--gold)', marginBottom: 10 }}>
          Jokers <span style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 400 }}>({me.jokers.length}/5 held)</span>
        </h3>
        {state.shopJokers.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Sold out.</p>
        ) : (
          <div className="shop-grid">
            {state.shopJokers.map(joker => {
              const canAfford = me.gold >= joker.cost;
              const jokersMax = me.jokers.length >= 5;
              return (
                <div className="shop-item" key={joker.id}>
                  <h4>{joker.name}</h4>
                  <div className={`rarity rarity-${joker.rarity}`}>{joker.rarity}</div>
                  <div className="desc">{joker.description}</div>
                  <div className="cost">💰 {joker.cost} gold</div>
                  <button
                    className="btn-primary"
                    disabled={!canAfford || jokersMax}
                    onClick={() => buyJoker(joker.id)}
                  >
                    {jokersMax ? 'Full (5/5)' : !canAfford ? 'Too expensive' : 'Buy'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Consumables for sale */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ color: 'var(--gold)', marginBottom: 10 }}>
          Arcana &amp; Celestial Stones <span style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 400 }}>({me.consumables.length}/2 held)</span>
        </h3>
        {state.shopConsumables.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Sold out.</p>
        ) : (
          <div className="shop-grid">
            {state.shopConsumables.map(c => {
              const canAfford = me.gold >= c.cost;
              const slotsMax = me.consumables.length >= 2;
              const levelLabel = c.levelsHandType
                ? ` · +${HAND_LEVEL_BONUS[c.levelsHandType].chips} chips +${HAND_LEVEL_BONUS[c.levelsHandType].mult} mult`
                : '';
              const currentLevel = c.levelsHandType
                ? (me.handLevels[c.levelsHandType] ?? 0) + 1
                : null;
              return (
                <div className={`shop-item shop-consumable shop-${c.type}`} key={c.id}>
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
                  <button
                    className="btn-secondary"
                    disabled={!canAfford || slotsMax}
                    onClick={() => buyConsumable(c.id)}
                  >
                    {slotsMax ? 'Full (2/2)' : !canAfford ? 'Too expensive' : 'Buy'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Your joker loadout */}
      {me.jokers.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: 8 }}>Your Jokers</h3>
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

      <button className="btn-primary" onClick={endShop}>
        Continue to Next Room →
      </button>
    </div>
  );
}
