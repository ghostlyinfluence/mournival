import { Player } from '@mournival/shared';
import { evaluateHand, HAND_LABEL, scoreHand } from '@mournival/shared';

interface Props {
  player: Player;
  allPlayers: Player[];
}

export function ScorePanel({ player, allPlayers }: Props) {
  const selectedCards = player.hand.filter(c => player.selectedCardIds.includes(c.id));

  if (selectedCards.length === 0) {
    return (
      <div className="score-panel">
        <div className="score-panel-label">Scoring Preview</div>
        <div className="score-panel-empty">Select cards to preview</div>
      </div>
    );
  }

  const evaluation = evaluateHand(selectedCards);
  const allHandTypes = allPlayers
    .filter(p => p.id !== player.id && p.selectedCardIds.length > 0)
    .map(p => evaluateHand(p.hand.filter(c => p.selectedCardIds.includes(c.id))).handType);
  allHandTypes.push(evaluation.handType);
  const breakdown = scoreHand(player, evaluation, allPlayers, allHandTypes);
  const level = player.handLevels[evaluation.handType] ?? 0;

  const glassCount = selectedCards.filter(c => c.enhancement === 'glass').length;
  const goldCount = selectedCards.filter(c => c.enhancement === 'gold').length;

  return (
    <div className="score-panel">
      <div className="score-panel-label">Scoring Preview</div>
      <div className="score-hand-type">
        {HAND_LABEL[evaluation.handType]}
        {level > 0 && <span className="level-badge">Lv {level + 1}</span>}
      </div>
      <div className="score-breakdown">
        <span className="score-chips">{breakdown.chips}</span>
        <span className="score-op"> chips × </span>
        <span className="score-mult">{breakdown.mult.toFixed(1)}</span>
        <span className="score-op"> mult</span>
      </div>
      <div className="score-damage">= {breakdown.damage} dmg</div>
      {glassCount > 0 && (
        <div style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 6 }}>
          ◆ {glassCount} glass card{glassCount !== 1 ? 's' : ''} — 25% break chance each
        </div>
      )}
      {goldCount > 0 && (
        <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: glassCount > 0 ? 2 : 6 }}>
          ● +{goldCount * 3} gold on score
        </div>
      )}
    </div>
  );
}
