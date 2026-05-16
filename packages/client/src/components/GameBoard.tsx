import { GameState } from '@mournival/shared';
import { MonsterDisplay } from './MonsterDisplay';
import { PlayerStatusPanel } from './PlayerStatusPanel';
import { HandArea } from './HandArea';
import { GameLog } from './GameLog';
import { RoundResultOverlay } from './RoundResultOverlay';
import { JokerBar } from './JokerBar';
import { ScorePanel } from './ScorePanel';
import { PokerTable } from './PokerTable';
import { MapView } from './MapView';

interface Props {
  state: GameState;
  myPlayerId: string;
}

export function GameBoard({ state, myPlayerId }: Props) {
  const me = state.players.find(p => p.id === myPlayerId);

  return (
    <div className="board">
      {/* Top strip: local player's jokers */}
      <JokerBar jokers={me?.jokers ?? []} />

      {/* Body: left sidebar | right log */}
      <div className="board-body">
        <div className="board-left">
          {state.monster && (
            <MonsterDisplay monster={state.monster} floor={state.floor} room={state.room} />
          )}
          <div className="board-left-players">
            {state.players.map(p => (
              <PlayerStatusPanel key={p.id} player={p} isMe={p.id === myPlayerId} />
            ))}
          </div>
          {me && me.status !== 'dead' && (
            <ScorePanel player={me} allPlayers={state.players} />
          )}
        </div>

        <div className="board-center">
          {state.phase === 'map'
            ? <MapView state={state} />
            : <PokerTable state={state} myPlayerId={myPlayerId} />
          }
        </div>

        <div className="board-right">
          <GameLog entries={state.log} />
        </div>
      </div>

      {/* Hand pinned to the bottom — hidden on the map screen */}
      {state.phase !== 'map' && (
        <div className="board-bottom">
          {me && me.status !== 'dead' ? (
            <HandArea player={me} allPlayers={state.players} />
          ) : me?.status === 'dead' ? (
            <div style={{ padding: '16px 0', color: 'var(--text-dim)', textAlign: 'center' }}>
              <span style={{ fontSize: 28, marginRight: 10 }}>☠</span>
              You have fallen. Watch your companions fight on.
            </div>
          ) : null}
        </div>
      )}

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
