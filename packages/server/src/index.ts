import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  selectCards,
  discardCards,
  playHands,
  advanceAfterResult,
  buyJoker,
  endShop,
} from '@mournival/shared';
import {
  createRoom,
  joinRoom,
  getRoomBySocket,
  getPlayerIdBySocket,
  removeSocket,
  setClass,
  startGame,
  updateRoom,
} from './rooms.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

function broadcast(roomCode: string, state: Parameters<ServerToClientEvents['state']>[0]) {
  io.to(roomCode).emit('state', state);
}

io.on('connection', socket => {
  console.log('connected:', socket.id);

  socket.on('room:create', (playerName, cb) => {
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    cb(room.code);
    broadcast(room.code, room.state);
  });

  socket.on('room:join', (code, playerName, cb) => {
    const result = joinRoom(socket.id, code, playerName);
    if (typeof result === 'string') {
      cb(false, result);
      return;
    }
    socket.join(code);
    cb(true);
    broadcast(code, result.state);
  });

  socket.on('game:select-class', className => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    const updated = setClass(room, playerId, className);
    broadcast(updated.code, updated.state);
  });

  socket.on('game:ready', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    if (room.state.phase === 'class-select' || room.state.phase === 'lobby') {
      const allHaveClass = room.state.players.every(p => p.class);
      if (allHaveClass) {
        const updated = startGame(room);
        broadcast(updated.code, updated.state);
      }
    }
  });

  socket.on('game:select-cards', cardIds => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    const newState = selectCards(room.state, playerId, cardIds);
    updateRoom(room, newState);
    broadcast(room.code, room.state);
  });

  socket.on('game:play-hand', () => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;

    const player = room.state.players.find(p => p.id === playerId);
    if (!player || player.selectedCardIds.length === 0) return;

    // Mark player as ready
    room.state = {
      ...room.state,
      players: room.state.players.map(p =>
        p.id === playerId ? { ...p, status: 'ready' } : p
      ),
    };

    const activePlayers = room.state.players.filter(p => p.status !== 'dead');
    const allReady = activePlayers.every(p => p.status === 'ready');

    if (allReady) {
      const resolved = playHands(room.state);
      updateRoom(room, resolved);
    }

    broadcast(room.code, room.state);
  });

  socket.on('game:discard', () => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    const newState = discardCards(room.state, playerId);
    updateRoom(room, newState);
    broadcast(room.code, room.state);
  });

  socket.on('game:buy-joker', jokerId => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    const newState = buyJoker(room.state, playerId, jokerId);
    updateRoom(room, newState);
    broadcast(room.code, room.state);
  });

  socket.on('game:end-shop', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    // Wait until all players signal ready or just advance
    const newState = endShop(room.state);
    updateRoom(room, newState);
    broadcast(room.code, room.state);
  });

  // Client signals it has seen the round result and wants to continue
  socket.on('game:ready', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    if (room.state.phase === 'round-result') {
      const newState = advanceAfterResult(room.state);
      updateRoom(room, newState);
      broadcast(room.code, newState);
    }
  });

  socket.on('disconnect', () => {
    const room = removeSocket(socket.id);
    if (room) broadcast(room.code, room.state);
    console.log('disconnected:', socket.id);
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => console.log(`Mournival server listening on :${PORT}`));
