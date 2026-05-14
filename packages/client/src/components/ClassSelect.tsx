import { ClassName, GameState } from '@mournival/shared';
import { CLASS_DEFINITIONS } from '@mournival/shared';
import { useGameStore } from '../store/gameStore';

interface Props {
  state: GameState;
  myPlayerId: string;
  roomCode: string;
}

export function ClassSelect({ state, myPlayerId, roomCode }: Props) {
  const { selectClass, startGame } = useGameStore();
  const me = state.players.find(p => p.id === myPlayerId);
  const allHaveClass = state.players.every(p => p.class);

  const classes: ClassName[] = ['Fighter', 'Rogue', 'Wizard', 'Cleric', 'Ranger', 'Bard'];

  return (
    <div className="class-select">
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 4 }}>
          Room Code: <strong style={{ color: 'var(--gold)', letterSpacing: 2 }}>{roomCode}</strong>
          <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>· Share with friends to join</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Players: {state.players.map(p => p.name).join(', ')}
        </div>
      </div>

      <h2>Choose Your Class</h2>

      <div className="class-grid">
        {classes.map(cls => {
          const def = CLASS_DEFINITIONS[cls];
          return (
            <div
              key={cls}
              className={`class-card${me?.class === cls ? ' selected' : ''}`}
              onClick={() => selectClass(cls)}
            >
              <h3>{cls}</h3>
              <p style={{ fontSize: 13, color: 'var(--text)' }}>{def.description}</p>
              <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-dim)', marginTop: 4 }}>{def.flavour}</p>
              <p className="hp-gold">❤️ {def.startingHP} HP · 💰 {def.startingGold} starting gold</p>
              <p className="passive">{def.passiveLabel}</p>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center' }}>
        {state.players.map(p => (
          <span key={p.id} style={{ marginRight: 12, fontSize: 13, color: p.class ? 'var(--green)' : 'var(--text-dim)' }}>
            {p.name}: {p.class || 'choosing…'}
          </span>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button
          className="btn-primary"
          disabled={!me?.class}
          onClick={startGame}
        >
          {allHaveClass ? 'Start Adventure!' : 'Ready (waiting for all players)'}
        </button>
      </div>
    </div>
  );
}
