import { useGameStore } from './store/gameStore';
import { Lobby } from './components/Lobby';
import { ClassSelect } from './components/ClassSelect';
import { GameBoard } from './components/GameBoard';
import { Shop } from './components/Shop';

export function App() {
  const { state, roomCode, myPlayerId } = useGameStore();

  if (!state || !roomCode || !myPlayerId) {
    return <Lobby />;
  }

  if (state.phase === 'lobby' || state.phase === 'class-select') {
    return <ClassSelect state={state} myPlayerId={myPlayerId} roomCode={roomCode} />;
  }

  if (state.phase === 'shop') {
    return <Shop state={state} myPlayerId={myPlayerId} />;
  }

  if (state.phase === 'victory') {
    return (
      <div className="end-screen victory">
        <h1>VICTORY</h1>
        <p>The dungeon is cleared. The Mournival holds.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Play Again
        </button>
      </div>
    );
  }

  if (state.phase === 'defeat') {
    return (
      <div className="end-screen defeat">
        <h1>DEFEATED</h1>
        <p>The party falls. The dungeon claims another band of heroes.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  // combat or round-result
  return <GameBoard state={state} myPlayerId={myPlayerId} />;
}
