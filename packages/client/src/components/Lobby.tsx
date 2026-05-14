import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';

export function Lobby() {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const { createRoom, joinRoom, error } = useGameStore();

  const ensureConnected = (cb: () => void) => {
    setConnecting(true);
    if (socket.connected) { cb(); return; }
    socket.connect();
    socket.once('connect', () => { cb(); setConnecting(false); });
  };

  const handleCreate = () => {
    if (!playerName.trim()) return;
    ensureConnected(() => createRoom(playerName.trim()));
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinCode.trim()) return;
    ensureConnected(() => joinRoom(joinCode.trim().toUpperCase(), playerName.trim()));
  };

  return (
    <div className="lobby">
      <h1 className="title-font">MOURNIVAL</h1>
      <p className="tagline">A co-op roguelike deckbuilder. Play poker hands. Slay monsters.</p>

      {error && (
        <div style={{ color: 'var(--red-light)', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      <div className="lobby-form">
        <input
          placeholder="Your name"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          maxLength={20}
          style={{ width: 240 }}
        />

        <button className="btn-primary" onClick={handleCreate} disabled={!playerName.trim() || connecting}>
          Create New Game
        </button>

        <div className="lobby-divider">— or join an existing game —</div>

        <div className="lobby-row">
          <input
            placeholder="Room code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
            style={{ width: 120, textTransform: 'uppercase' }}
          />
          <button className="btn-secondary" onClick={handleJoin} disabled={!playerName.trim() || !joinCode.trim() || connecting}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
