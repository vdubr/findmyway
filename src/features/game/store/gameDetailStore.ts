// Minimální store pro detail hry – slouží k předání názvu hry do breadcrumbu
import { create } from 'zustand';
import type { Game } from '../../../types';

interface GameDetailState {
  game: Game | null;
  setGame: (game: Game | null) => void;
}

export const useGameDetailStore = create<GameDetailState>((set) => ({
  game: null,
  setGame: (game) => set({ game }),
}));
