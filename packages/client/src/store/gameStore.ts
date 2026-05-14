import { create } from 'zustand';
import { GameState } from '@mournival/shared';
import { socket } from '../socket';

interface GameStore {
  state: GameState | null;
  roomCode: string | null;
  myPlayerId: string | null;
  error: string | null;
  shopJokerIds: string[];

  connect: () => void;
  createRoom: (playerName: string) => void;
  joinRoom: (code: string, playerName: string) => void;
  selectClass: (className: string) => void;
  startGame: () => void;
  selectCards: (cardIds: string[]) => void;
  playHand: () => void;
  discard: () => void;
  buyJoker: (jokerId: string) => void;
  endShop: () => void;
  continueAfterResult: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  socket.on('state', state => set({ state }));
  socket.on('error', msg => set({ error: msg }));

  return {
    state: null,
    roomCode: null,
    myPlayerId: null,
    error: null,
    shopJokerIds: [],

    connect() {
      socket.connect();
    },

    createRoom(playerName) {
      socket.emit('room:create', playerName, roomCode => {
        set({ roomCode, myPlayerId: socket.id });
      });
    },

    joinRoom(code, playerName) {
      socket.emit('room:join', code, playerName, (ok, err) => {
        if (ok) set({ roomCode: code, myPlayerId: socket.id });
        else set({ error: err ?? 'Failed to join' });
      });
    },

    selectClass(className) {
      socket.emit('game:select-class', className as import('@mournival/shared').ClassName);
    },

    startGame() {
      socket.emit('game:ready');
    },

    selectCards(cardIds) {
      socket.emit('game:select-cards', cardIds);
    },

    playHand() {
      socket.emit('game:play-hand');
    },

    discard() {
      socket.emit('game:discard');
    },

    buyJoker(jokerId) {
      socket.emit('game:buy-joker', jokerId);
    },

    endShop() {
      socket.emit('game:end-shop');
    },

    continueAfterResult() {
      socket.emit('game:ready');
    },
  };
});
