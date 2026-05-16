import { GameState, ClassName } from '@mournival/shared';
import { applyClassToPlayer, createGameState, initPlayer, startFloor } from '@mournival/shared';

export interface Room {
  code: string;
  state: GameState;
  /** Tracks which players have explicitly selected a class via game:select-class */
  confirmedClassPlayerIds: Set<string>;
  /** Tracks which living players have pressed "Continue" in the shop */
  shopReadyPlayerIds: Set<string>;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const socketToPlayer = new Map<string, string>();

function generateCode(): string {
  let code: string;
  do {
    code = Math.random().toString(36).slice(2, 7).toUpperCase();
  } while (rooms.has(code));
  return code;
}

export function createRoom(socketId: string, playerName: string): Room {
  const code = generateCode();
  const player = initPlayer(socketId, playerName);
  const state = createGameState(code, [player]);
  const room: Room = { code, state, confirmedClassPlayerIds: new Set(), shopReadyPlayerIds: new Set() };
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
    room.state = { ...room.state, players: room.state.players.filter(p => p.id !== socketId) };
    room.confirmedClassPlayerIds.delete(socketId);
    room.shopReadyPlayerIds.delete(socketId);
    socketToRoom.delete(socketId);
    socketToPlayer.delete(socketId);
    if (room.state.players.length === 0) { rooms.delete(room.code); return undefined; }
  }
  return room;
}

export function setClass(room: Room, playerId: string, className: ClassName): Room {
  room.confirmedClassPlayerIds.add(playerId);
  room.state = {
    ...room.state,
    players: room.state.players.map(p =>
      p.id === playerId ? applyClassToPlayer({ ...p, class: className }) : p
    ),
    phase: 'class-select',
  };
  return room;
}

export function allClassesConfirmed(room: Room): boolean {
  return room.state.players.every(p => room.confirmedClassPlayerIds.has(p.id));
}

export function startGame(room: Room): Room {
  room.confirmedClassPlayerIds.clear();
  room.state = startFloor(room.state);
  return room;
}

export function updateRoom(room: Room, newState: GameState): Room {
  room.state = newState;
  return room;
}
