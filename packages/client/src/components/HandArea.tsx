import { Player } from '@mournival/shared';
import { CardComponent } from './CardComponent';
import { ConsumableTray } from './ConsumableTray';
import { useGameStore } from '../store/gameStore';

interface Props {
  player: Player;
  allPlayers: Player[];
}

export function HandArea({ player }: Props) {
  const { selectCards, playHand, discard, activeConsumableId, setActiveConsumable, useConsumable } = useGameStore();

  const selectedIds = player.selectedCardIds;
  const inConsumableMode = activeConsumableId !== null;
  const activeConsumable = player.consumables.find(c => c.id === activeConsumableId);

  const canPlay = !inConsumableMode && selectedIds.length >= 1 && selectedIds.length <= 5 && player.handsLeft > 0 && player.status !== 'dead';
  const canDiscard = !inConsumableMode && selectedIds.length >= 1 && player.discardsLeft > 0 && player.status !== 'dead';

  const toggleCard = (cardId: string) => {
    if (inConsumableMode) {
      if (selectedIds.includes(cardId)) {
        selectCards(selectedIds.filter(id => id !== cardId));
      } else if (activeConsumable && selectedIds.length < activeConsumable.maxTargets) {
        selectCards([...selectedIds, cardId]);
      }
    } else {
      if (selectedIds.includes(cardId)) {
        selectCards(selectedIds.filter(id => id !== cardId));
      } else if (selectedIds.length < 5) {
        selectCards([...selectedIds, cardId]);
      }
    }
  };

  const handleUseConsumable = () => {
    if (!activeConsumable) return;
    useConsumable(activeConsumable.id, selectedIds);
    selectCards([]);
  };

  return (
    <div className="hand-area">
      <ConsumableTray player={player} />

      <div className="hand-header">
        <span className="hand-label">
          {inConsumableMode && activeConsumable
            ? `🎴 ${activeConsumable.name} — Select ${activeConsumable.minTargets}–${activeConsumable.maxTargets} cards`
            : 'YOUR HAND'}
        </span>
      </div>

      <div className="hand-cards">
        {player.hand.map(card => (
          <CardComponent
            key={card.id}
            card={card}
            selected={selectedIds.includes(card.id)}
            onClick={() => toggleCard(card.id)}
            disabled={player.status === 'dead'}
          />
        ))}
      </div>

      <div className="hand-actions">
        {inConsumableMode ? (
          <>
            <button
              className="btn-primary"
              disabled={!activeConsumable || selectedIds.length < (activeConsumable.minTargets)}
              onClick={handleUseConsumable}
            >
              Use {activeConsumable?.name}
            </button>
            <button className="btn-secondary" onClick={() => { setActiveConsumable(null); selectCards([]); }}>
              Cancel
            </button>
            <span className="action-label">
              {selectedIds.length} / {activeConsumable?.maxTargets} cards selected
            </span>
          </>
        ) : (
          <>
            <button
              className="btn-primary"
              disabled={!canPlay || player.status === 'ready'}
              onClick={playHand}
            >
              Play Hand ({player.handsLeft} left)
            </button>
            <button
              className="btn-secondary"
              disabled={!canDiscard || player.status === 'ready'}
              onClick={discard}
            >
              Discard ({player.discardsLeft} left)
            </button>
            <span className="action-label">
              {selectedIds.length === 0 ? 'Select 1–5 cards' : `${selectedIds.length} card${selectedIds.length !== 1 ? 's' : ''} selected`}
              {player.status === 'ready' && <span style={{ color: 'var(--green)', marginLeft: 8 }}>✓ Waiting for teammates…</span>}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
