import { GameState, MonsterState, Player } from '@mournival/shared';

interface Props {
  state: GameState;
  myPlayerId: string;
}

// Seat center positions (left%, top%) for 1–4 players.
// Ellipse: center ~(50%, 48%), axes ~(34%, 32%) of container.
// Seats sit just outside the ellipse edge.
const PLAYER_POSITIONS: { left: string; top: string }[][] = [
  [],
  [{ left: '50%', top: '84%' }],
  [{ left: '27%', top: '78%' }, { left: '73%', top: '78%' }],
  [{ left: '20%', top: '66%' }, { left: '50%', top: '84%' }, { left: '80%', top: '66%' }],
  [{ left: '16%', top: '56%' }, { left: '35%', top: '82%' }, { left: '65%', top: '82%' }, { left: '84%', top: '56%' }],
];

function SeatHPBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const fill = pct > 50 ? color : pct > 25 ? 'var(--gold)' : 'var(--red)';
  return (
    <div className="seat-hp-bar">
      <div className="seat-hp-fill" style={{ width: `${pct}%`, background: fill }} />
    </div>
  );
}

function PlayerSeatCard({ player, isMe }: { player: Player; isMe: boolean }) {
  const statusColor =
    player.status === 'ready' ? 'var(--green)' :
    player.status === 'dead'  ? 'var(--red)'   : 'var(--text-dim)';
  const statusIcon =
    player.status === 'ready' ? '✓' :
    player.status === 'dead'  ? '☠' : '…';

  return (
    <div className={`seat-card${isMe ? ' seat-me' : ''}${player.status === 'dead' ? ' seat-dead' : ''}`}>
      <div className="seat-name">{player.name}</div>
      <div className="seat-class">{player.class}</div>
      <SeatHPBar current={player.hp} max={player.maxHP} color="var(--green)" />
      <div className="seat-footer">
        <span style={{ color: 'var(--text-dim)' }}>{player.hp}/{player.maxHP}</span>
        <span style={{ color: statusColor }}>{statusIcon}</span>
      </div>
      {player.selectedCardIds.length > 0 && player.status !== 'dead' && (
        <div className="seat-cards-indicator">
          {player.selectedCardIds.length}c
        </div>
      )}
    </div>
  );
}

function EmptySeat() {
  return <div className="seat-empty-card">🪑</div>;
}

function DealerCard({ monster }: { monster: MonsterState }) {
  const { definition: def, currentHP, shieldHP } = monster;
  return (
    <div className="seat-card seat-dealer">
      {def.isBoss && (
        <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 2 }}>⚔ BOSS</div>
      )}
      <div className="seat-name" style={{ color: 'var(--red-light)', maxWidth: 140 }}>{def.name}</div>
      <SeatHPBar current={currentHP} max={def.maxHP} color="var(--red)" />
      <div className="seat-footer">
        <span style={{ color: 'var(--text-dim)' }}>{currentHP}/{def.maxHP}</span>
        {shieldHP > 0 && <span style={{ color: 'var(--cyan)' }}>🛡{shieldHP}</span>}
      </div>
      {def.weakness && (
        <div style={{ marginTop: 3, fontSize: 9, color: 'var(--gold)', background: 'rgba(212,170,64,0.1)', borderRadius: 3, padding: '1px 4px' }}>
          weak: {def.weakness.replace(/-/g, ' ')}
        </div>
      )}
    </div>
  );
}

export function PokerTable({ state, myPlayerId }: Props) {
  // Local player always gets the bottom-most seat position
  const me = state.players.find(p => p.id === myPlayerId);
  const others = state.players.filter(p => p.id !== myPlayerId);
  const ordered: (Player | null)[] = me ? [me, ...others] : [...state.players];

  const count = Math.min(state.players.length, 4);
  const positions = PLAYER_POSITIONS[count] ?? [];
  // Pad with nulls for empty seats (always show all 4 chairs)
  const seats: (Player | null)[] = [
    ...ordered,
    ...Array(Math.max(0, 4 - ordered.length)).fill(null),
  ];

  return (
    <div className="poker-table-wrap">
      {/* Felt surface */}
      <div className="poker-felt">
        <div className="felt-label">⚜ MOURNIVAL ⚜</div>
        <span className="felt-suit" style={{ top: '28%', left: '14%' }}>♠</span>
        <span className="felt-suit" style={{ top: '28%', right: '14%' }}>♥</span>
        <span className="felt-suit" style={{ bottom: '28%', left: '14%' }}>♣</span>
        <span className="felt-suit" style={{ bottom: '28%', right: '14%' }}>♦</span>
      </div>

      {/* Dealer / Monster at top */}
      <div className="table-seat" style={{ left: '50%', top: '8%', transform: 'translate(-50%, 0)' }}>
        {state.monster ? (
          <DealerCard monster={state.monster} />
        ) : (
          <EmptySeat />
        )}
      </div>

      {/* Player seats — always render 4, populate with players or empty */}
      {PLAYER_POSITIONS[4].map((pos, i) => (
        <div
          key={i}
          className="table-seat"
          style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}
        >
          {seats[i] ? (
            <PlayerSeatCard player={seats[i]!} isMe={seats[i]!.id === myPlayerId} />
          ) : (
            <EmptySeat />
          )}
        </div>
      ))}
    </div>
  );
}
