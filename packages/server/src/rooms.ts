import { GameState, ClassName } from '@mournival/shared';
import {
  applyClassToPlayer,
  createGameState,
  initPlayer,
  startCombat,
} from '@mournival/shared';
import { getShopJokers } from '@mournival/shared';

export interface Room {
  code: string;
  state: GameState;
  shopJokers: ReturnType<typeof getShopJokers>;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const socketToPlayer = new Map<string, string>();

function generateCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function createRoom(socketId: string, playerName: string): Room {
  const code = generateCode();
  const player = initPlayer(socketId, playerName);
  const state = createGameState(code, [player]);
  const room: Room = { code, state, shopJokers: [] };
  rooms.set(code, room);
  socketToRoom.set(socketId, code);
  socketToPlayer.set(socketId, socketId);
  return room;
}

export function joinRoom(socketId: string, code: string, playerName: string): Room | string {
  const room = rooms.get(code);
  if (!room) return 'Room not found';
  if (room.state.players.length >= 4) return 'Room is full';
  if (room.state.phase !== 'lobby' && room.state.phase !== 'class-select') return 'Game already started';
  if (room.state.players.find(p => p.name === playerName)) return 'Name already taken';

  const player = initPlayer(socketId, playerName);
  room.state = { ...room.state, players: [...room.state.players, player] };
  socketToRoom.set(socketId, code);
  socketToPlayer.set(socketId, socketId);
  return room;
}

export function getRoomBySocket(socketId: string): Room | undefined {
  const code = socketToRoom.get(socketId);
  if (!code) return undefined;
  return rooms.get(code);
}

export function getPlayerIdBySocket(socketId: string): string | undefined {
  return socketToPlayer.get(socketId);
}

export function removeSocket(socketId: string): Room | undefined {
  const room = getRoomBySocket(socketId);
  if (room) {
    room.state = {
      ...room.state,
      players: room.state.players.filter(p => p.id !== socketId),
    };
    socketToRoom.delete(socketId);
    socketToPlayer.delete(socketId);
    if (room.state.players.length === 0) {
      rooms.delete(room.code);
      return undefined;
    }
  }
  return room;
}

export function setClass(room: Room, playerId: string, className: ClassName): Room {
  room.state = {
    ...room.state,
    players: room.state.players.map(p =>
      p.id === playerId ? applyClassToPlayer({ ...p, class: className }) : p
    ),
    phase: 'class-select',
  };
  return room;
}

export function startGame(room: Room): Room {
  room.state = startCombat(room.state);
  return room;
}

export function updateRoom(room: Room, newState: GameState): Room {
  room.state = newState;
  if (newState.phase === 'shop') {
    room.shopJokers = getShopJokers(newState.floor, newState.room);
  }
  return room;
}
