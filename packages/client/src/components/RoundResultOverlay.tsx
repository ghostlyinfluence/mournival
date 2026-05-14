import { RoundResult, Player } from '@mournival/shared';
import { HAND_LABEL } from '@mournival/shared';
import { useGameStore } from '../store/gameStore';

interface Props {
  result: RoundResult;
  players: Player[];
  monsterName: string;
  monsterHP: number;
  monsterMaxHP: number;
}

export function RoundResultOverlay({ result, players, monsterName, monsterHP, monsterMaxHP }: Props) {
  const { continueAfterResult } = useGameStore();

  const actionLabel = (() => {
    const a = result.monsterAction;
    if (a.type === 'attack') return `${monsterName} attacks for ${a.damage} dmg`;
    if (a.type === 'attack-all') return `${monsterName} AOE attacks for ${a.damage} dmg`;
    if (a.type === 'buff-self') return `${monsterName}: ${a.label}`;
    if (a.type === 'debuff-player') return `${monsterName}: ${a.label}`;
    return '';
  })();

  return (
    <div className="overlay">
      <div className="result-panel">
        <h2>{result.monsterDied ? '⚔️ Monster Slain!' : '⚡ Round Complete'}</h2>

        {result.playerDamage.map(pd => {
          const pname = players.find(p => p.id === pd.playerId)?.name ?? 'Unknown';
          return (
            <div className="result-row" key={pd.playerId}>
              <span>{pname} — {HAND_LABEL[pd.handType]}</span>
              <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{pd.damage} dmg</span>
            </div>
          );
        })}

        <div className="result-total">Total: {result.totalDamage} damage dealt</div>

        {!result.monsterDied && (
          <div className="result-monster">
            {actionLabel}
            <br />
            <span style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
              {monsterName}: {monsterHP}/{monsterMaxHP} HP remaining
            </span>
          </div>
        )}

        {result.damageToPlayers.length > 0 && !result.monsterDied && (
          <div style={{ marginTop: 12 }}>
            {result.damageToPlayers.map(d => {
              const pname = players.find(p => p.id === d.playerId)?.name ?? 'Unknown';
              return (
                <div key={d.playerId} style={{ fontSize: 13, color: 'var(--red-light)' }}>
                  {pname} took {d.damage} damage
                </div>
              );
            })}
          </div>
        )}

        <button className="btn-primary" style={{ marginTop: 20 }} onClick={continueAfterResult}>
          {result.monsterDied ? 'Claim Reward →' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
