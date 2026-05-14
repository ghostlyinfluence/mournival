import { GameState } from '@mournival/shared';
import { getShopJokers } from '@mournival/shared';
import { useGameStore } from '../store/gameStore';

interface Props {
  state: GameState;
  myPlayerId: string;
}

export function Shop({ state, myPlayerId }: Props) {
  const { buyJoker, endShop } = useGameStore();
  const me = state.players.find(p => p.id === myPlayerId);
  const shopJokers = getShopJokers(state.floor, state.room);

  if (!me) return null;

  return (
    <div className="shop">
      <h2>The Wandering Merchant</h2>
      <p className="shop-subtitle">
        Floor {state.floor} · Room {state.room} · You have <strong style={{ color: 'var(--gold)' }}>{me.gold} gold</strong>
      </p>

      <div className="shop-grid">
        {shopJokers.map(joker => {
          const alreadyOwned = me.jokers.some(j => j.id === joker.id);
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
                disabled={!canAfford || alreadyOwned || jokersMax}
                onClick={() => buyJoker(joker.id)}
              >
                {alreadyOwned ? 'Owned' : jokersMax ? 'Full (5/5)' : !canAfford ? 'Too expensive' : 'Buy'}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ color: 'var(--gold)', marginBottom: 8 }}>Your Jokers</h3>
        {me.jokers.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>None yet.</p>
        ) : (
          <div className="shop-grid">
            {me.jokers.map(j => (
              <div className="shop-item" key={j.id}>
                <h4>{j.name}</h4>
                <div className={`rarity rarity-${j.rarity}`}>{j.rarity}</div>
                <div className="desc">{j.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn-primary" onClick={endShop}>
        Continue to Next Room →
      </button>
    </div>
  );
}
