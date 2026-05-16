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
  buyConsumable,
  useConsumable,
  endShop,
  buyPack,
  pickFromPack,
  closePack,
  selectNode,
} from '@mournival/shared';
import {
  createRoom,
  joinRoom,
  getRoomBySocket,
  getPlayerIdBySocket,
  removeSocket,
  setClass,
  allClassesConfirmed,
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

  // Handles both class-select confirmation and round-result continuation.
  socket.on('game:ready', () => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room) return;

    if (room.state.phase === 'class-select' || room.state.phase === 'lobby') {
      // Only start when every player has explicitly called game:select-class.
      if (allClassesConfirmed(room)) {
        const updated = startGame(room);
        broadcast(updated.code, updated.state);
      }
    } else if (room.state.phase === 'round-result') {
      const newState = advanceAfterResult(room.state);
      updateRoom(room, newState);
      broadcast(room.code, room.state);
    }
    void playerId; // playerId unused here but kept for consistency
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

    // Mark this player ready, then resolve if everyone is.
    const withReady = {
      ...room.state,
      players: room.state.players.map(p =>
        p.id === playerId ? { ...p, status: 'ready' as const } : p
      ),
    };
    updateRoom(room, withReady);

    const activePlayers = room.state.players.filter(p => p.status !== 'dead');
    if (activePlayers.every(p => p.status === 'ready')) {
      updateRoom(room, playHands(room.state));
    }

    broadcast(room.code, room.state);
  });

  socket.on('game:discard', () => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    updateRoom(room, discardCards(room.state, playerId));
    broadcast(room.code, room.state);
  });

  socket.on('game:buy-joker', jokerId => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    updateRoom(room, buyJoker(room.state, playerId, jokerId));
    broadcast(room.code, room.state);
  });

  socket.on('game:buy-consumable', consumableId => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    updateRoom(room, buyConsumable(room.state, playerId, consumableId));
    broadcast(room.code, room.state);
  });

  socket.on('game:use-consumable', (consumableId, targetCardIds) => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    updateRoom(room, useConsumable(room.state, playerId, consumableId, targetCardIds));
    broadcast(room.code, room.state);
  });

  socket.on('game:buy-pack', packId => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    updateRoom(room, buyPack(room.state, playerId, packId));
    broadcast(room.code, room.state);
  });

  socket.on('game:pick-from-pack', itemId => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    updateRoom(room, pickFromPack(room.state, playerId, itemId));
    broadcast(room.code, room.state);
  });

  socket.on('game:close-pack', () => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;
    updateRoom(room, closePack(room.state, playerId));
    broadcast(room.code, room.state);
  });

  // First player to click a node selects it for the whole party.
  socket.on('game:select-node', nodeId => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.state.phase !== 'map') return;
    updateRoom(room, selectNode(room.state, nodeId));
    broadcast(room.code, room.state);
  });

  // Each player must confirm before the shop closes — last one triggers the advance.
  socket.on('game:end-shop', () => {
    const room = getRoomBySocket(socket.id);
    const playerId = getPlayerIdBySocket(socket.id);
    if (!room || !playerId) return;

    room.shopReadyPlayerIds.add(playerId);
    const livingPlayers = room.state.players.filter(p => p.status !== 'dead');
    if (livingPlayers.every(p => room.shopReadyPlayerIds.has(p.id))) {
      room.shopReadyPlayerIds.clear();
      updateRoom(room, endShop(room.state));
    }
    broadcast(room.code, room.state);
  });

  socket.on('disconnect', () => {
    const room = removeSocket(socket.id);
    if (room) broadcast(room.code, room.state);
    console.log('disconnected:', socket.id);
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => console.log(`Mournival server listening on :${PORT}`));
