import { GameState } from '@mournival/shared';
import { MonsterDisplay } from './MonsterDisplay';
import { PlayerStatusPanel } from './PlayerStatusPanel';
import { HandArea } from './HandArea';
import { GameLog } from './GameLog';
import { RoundResultOverlay } from './RoundResultOverlay';

interface Props {
  state: GameState;
  myPlayerId: string;
}

export function GameBoard({ state, myPlayerId }: Props) {
  const me = state.players.find(p => p.id === myPlayerId);

  return (
    <div className="board">
      {/* Top bar: monster + all player statuses */}
      <div className="board-top">
        {state.monster && (
          <MonsterDisplay monster={state.monster} floor={state.floor} room={state.room} />
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {state.players.map(p => (
            <PlayerStatusPanel key={p.id} player={p} isMe={p.id === myPlayerId} />
          ))}
        </div>
      </div>

      {/* Main area: hand + log */}
      <div className="board-main">
        <div className="board-center">
          {me && me.status !== 'dead' ? (
            <HandArea player={me} allPlayers={state.players} />
          ) : me?.status === 'dead' ? (
            <div style={{ padding: 32, color: 'var(--text-dim)', textAlign: 'center' }}>
              <div style={{ fontSize: 32 }}>☠</div>
              <div>You have fallen. Watch your companions fight on.</div>
            </div>
          ) : null}
        </div>

        <div className="board-right">
          <GameLog entries={state.log} />
        </div>
      </div>

      {/* Round result overlay */}
      {state.phase === 'round-result' && state.lastRoundResult && state.monster && (
        <RoundResultOverlay
          result={state.lastRoundResult}
          players={state.players}
          monsterName={state.monster.definition.name}
          monsterHP={state.monster.currentHP}
          monsterMaxHP={state.monster.definition.maxHP}
        />
      )}
    </div>
  );
}
