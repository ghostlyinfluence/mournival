import { create } from 'zustand';
import { GameState, ClassName } from '@mournival/shared';
import { socket } from '../socket';

interface GameStore {
  state: GameState | null;
  roomCode: string | null;
  myPlayerId: string | null;
  error: string | null;
  // Client-side consumable targeting state
  activeConsumableId: string | null;

  connect: () => void;
  createRoom: (playerName: string) => void;
  joinRoom: (code: string, playerName: string) => void;
  selectClass: (className: ClassName) => void;
  startGame: () => void;
  selectCards: (cardIds: string[]) => void;
  playHand: () => void;
  discard: () => void;
  buyJoker: (jokerId: string) => void;
  buyConsumable: (consumableId: string) => void;
  buyPack: (packId: string) => void;
  pickFromPack: (itemId: string) => void;
  closePack: () => void;
  setActiveConsumable: (consumableId: string | null) => void;
  useConsumable: (consumableId: string, targetCardIds: string[]) => void;
  endShop: () => void;
  continueAfterResult: () => void;
  selectNode: (nodeId: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  socket.on('state', state => set({ state }));
  socket.on('error', msg => set({ error: msg }));

  return {
    state: null,
    roomCode: null,
    myPlayerId: null,
    error: null,
    activeConsumableId: null,

    connect() { socket.connect(); },

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
      socket.emit('game:select-class', className);
    },

    startGame() { socket.emit('game:ready'); },

    selectCards(cardIds) { socket.emit('game:select-cards', cardIds); },

    playHand() { socket.emit('game:play-hand'); },

    discard() { socket.emit('game:discard'); },

    buyJoker(jokerId) { socket.emit('game:buy-joker', jokerId); },

    buyConsumable(consumableId) { socket.emit('game:buy-consumable', consumableId); },

    buyPack(packId) { socket.emit('game:buy-pack', packId); },

    pickFromPack(itemId) { socket.emit('game:pick-from-pack', itemId); },

    closePack() { socket.emit('game:close-pack'); },

    setActiveConsumable(consumableId) { set({ activeConsumableId: consumableId }); },

    useConsumable(consumableId, targetCardIds) {
      socket.emit('game:use-consumable', consumableId, targetCardIds);
      set({ activeConsumableId: null });
    },

    endShop() { socket.emit('game:end-shop'); },

    continueAfterResult() { socket.emit('game:ready'); },

    selectNode(nodeId) { socket.emit('game:select-node', nodeId); },
  };
});
