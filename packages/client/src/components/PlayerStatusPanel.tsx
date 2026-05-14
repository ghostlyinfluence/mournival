import { Player } from '@mournival/shared';

interface Props {
  player: Player;
  isMe: boolean;
}

export function PlayerStatusPanel({ player, isMe }: Props) {
  const hpPct = (player.hp / player.maxHP) * 100;

  return (
    <div className={`player-status${isMe ? ' me' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="player-name">{player.name}{isMe ? ' (you)' : ''}</span>
        <span
          className={
            player.status === 'ready' ? 'status-ready' :
            player.status === 'dead' ? 'status-dead' : 'status-waiting'
          }
          style={{ fontSize: 11 }}
        >
          {player.status === 'ready' ? '✓ Ready' : player.status === 'dead' ? '☠ Dead' : '…picking'}
        </span>
      </div>
      <div className="player-class">{player.class}</div>
      <div style={{ margin: '6px 0 2px' }}>
        <div className="hp-bar">
          <div className="hp-fill" style={{ width: `${hpPct}%` }} />
        </div>
        <div className="player-hp">HP: {player.hp}/{player.maxHP}</div>
      </div>
      <div className="player-resources">
        💰 {player.gold} gold · 🃏 {player.deck.length} deck · ✋ {player.handsLeft} hands · 🗑 {player.discardsLeft} discards
      </div>
      {player.jokers.length > 0 && (
        <div className="player-jokers">
          {player.jokers.map(j => (
            <span key={j.id} className="joker-badge" title={j.description}>{j.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
