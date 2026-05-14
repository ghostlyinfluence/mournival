import { Player } from '@mournival/shared';
import { evaluateHand, HAND_LABEL, HAND_BASE, scoreHand } from '@mournival/shared';
import { CardComponent } from './CardComponent';
import { useGameStore } from '../store/gameStore';

interface Props {
  player: Player;
  allPlayers: Player[];
}

export function HandArea({ player, allPlayers }: Props) {
  const { selectCards, playHand, discard } = useGameStore();

  const selectedIds = player.selectedCardIds;
  const selectedCards = player.hand.filter(c => selectedIds.includes(c.id));
  const canPlay = selectedIds.length >= 1 && selectedIds.length <= 5 && player.handsLeft > 0 && player.status !== 'dead';
  const canDiscard = selectedIds.length >= 1 && player.discardsLeft > 0 && player.status !== 'dead';

  const toggleCard = (cardId: string) => {
    if (selectedIds.includes(cardId)) {
      selectCards(selectedIds.filter(id => id !== cardId));
    } else if (selectedIds.length < 5) {
      selectCards([...selectedIds, cardId]);
    }
  };

  // Live preview scoring
  const preview = (() => {
    if (selectedCards.length === 0) return null;
    const evaluation = evaluateHand(selectedCards);
    const allHandTypes = allPlayers
      .filter(p => p.id !== player.id && p.selectedCardIds.length > 0)
      .map(p => evaluateHand(p.hand.filter(c => p.selectedCardIds.includes(c.id))).handType);
    allHandTypes.push(evaluation.handType);
    const breakdown = scoreHand(player, evaluation, allPlayers, allHandTypes);
    return { evaluation, breakdown };
  })();

  return (
    <div className="hand-area">
      <div className="hand-header">
        <span className="hand-label">YOUR HAND</span>
        {preview && (
          <span className="hand-eval">
            <strong>{HAND_LABEL[preview.evaluation.handType]}</strong>{' '}
            · {preview.breakdown.chips} chips × {preview.breakdown.mult.toFixed(1)} mult{' '}
            = <strong style={{ color: 'var(--gold)' }}>{preview.breakdown.damage}</strong> dmg
          </span>
        )}
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
      </div>
    </div>
  );
}
