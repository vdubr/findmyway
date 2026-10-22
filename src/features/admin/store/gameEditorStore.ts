// Zustand store pro správu stavu při vytváření/editaci hry
import { create } from 'zustand';
import { getCheckpointsWithSecrets, getGameById } from '../../../lib/api';
import { toUserMessage } from '../../../lib/errors';
import { DEFAULT_GAME_SETTINGS } from '../../../lib/mappers';
import type {
  CheckpointContent,
  CheckpointType,
  CheckpointWithSecret,
  CreateGameInput,
  Game,
  GameSettings,
  SaveCheckpointInput,
  SecretSolution,
} from '../../../types';

// Checkpoint v editoru (před uložením do DB i po něm)
export interface TempCheckpoint {
  tempId: string; // Dočasné ID před uložením do DB
  id?: string; // Reálné ID po uložení
  order_index: number;
  latitude: number;
  longitude: number;
  radius: number;
  type: CheckpointType;
  content: CheckpointContent;
  // Řešení úkolu – do DB jde do checkpoint_secrets (čte jen tvůrce), hráč dostává jen hash
  secret_solution: SecretSolution | null;
  puzzle_answer: string | null;
  is_fake?: boolean; // Falešný checkpoint (zatím bez vlivu na průběh hry)
}

interface GameEditorState {
  // Current game being edited
  currentGame: Game | null;

  // Checkpointy během editace (zdroj pravdy pro uložení – co tu není, se v DB smaže)
  tempCheckpoints: TempCheckpoint[];

  // Selected checkpoint for editing
  selectedCheckpointId: string | null;

  // Loading state pro loadGame
  isLoading: boolean;
  loadError: string | null;

  // Actions
  setCurrentGame: (game: Game | null) => void;
  initNewGame: (gameData: CreateGameInput) => void;
  loadGame: (gameId: string) => Promise<void>; // Načte hru a checkpointy z API podle ID
  updateCurrentGame: (gameData: CreateGameInput) => void;

  // Checkpoint management
  addTempCheckpoint: (latitude: number, longitude: number) => void;
  updateTempCheckpoint: (tempId: string, updates: Partial<TempCheckpoint>) => void;
  deleteTempCheckpoint: (tempId: string) => void;
  reorderCheckpoints: (fromIndex: number, toIndex: number) => void;
  // Po uložení nahradit checkpointy těmi z DB (nová ID)
  setSavedCheckpoints: (checkpoints: CheckpointWithSecret[]) => void;

  // Selected checkpoint
  selectCheckpoint: (tempId: string | null) => void;

  // Reset
  reset: () => void;
}

// Nastavení hry z formuláře doplněné o výchozí hodnoty
function toGameSettings(settings: CreateGameInput['settings']): GameSettings {
  return {
    radius_tolerance: settings?.radius_tolerance ?? DEFAULT_GAME_SETTINGS.radius_tolerance,
    allow_skip: settings?.allow_skip ?? DEFAULT_GAME_SETTINGS.allow_skip,
    max_players: settings?.max_players ?? DEFAULT_GAME_SETTINGS.max_players,
    time_limit: settings?.time_limit ?? DEFAULT_GAME_SETTINGS.time_limit,
    share_location_required:
      settings?.share_location_required ?? DEFAULT_GAME_SETTINGS.share_location_required,
    show_radius: settings?.show_radius ?? DEFAULT_GAME_SETTINGS.show_radius,
  };
}

function toTempCheckpoint(cp: CheckpointWithSecret): TempCheckpoint {
  return {
    tempId: cp.id, // Reálné ID slouží i jako tempId
    id: cp.id,
    order_index: cp.order_index,
    latitude: cp.latitude,
    longitude: cp.longitude,
    radius: cp.radius,
    type: cp.type,
    content: cp.content,
    secret_solution: cp.secret?.secret_solution ?? null,
    puzzle_answer: cp.secret?.puzzle_answer ?? null,
    is_fake: cp.is_fake,
  };
}

// Checkpoint z editoru ve tvaru pro RPC save_game_checkpoints
export function toSaveCheckpointInput(cp: TempCheckpoint): SaveCheckpointInput {
  return {
    id: cp.id,
    order_index: cp.order_index,
    latitude: cp.latitude,
    longitude: cp.longitude,
    radius: cp.radius,
    type: cp.type,
    content: cp.content,
    is_fake: cp.is_fake ?? false,
    // Řešení má smysl jen u odpovídajícího typu – u ostatních se v DB smaže
    secret_solution: cp.type === 'input' ? cp.secret_solution : null,
    puzzle_answer: cp.type === 'puzzle' ? cp.puzzle_answer : null,
  };
}

// Pořadové číslo posledního načítání hry (viz loadGame)
let loadRequestId = 0;

export const useGameEditorStore = create<GameEditorState>((set, get) => ({
  currentGame: null,
  tempCheckpoints: [],
  selectedCheckpointId: null,
  isLoading: false,
  loadError: null,

  setCurrentGame: (game) => set({ currentGame: game }),

  initNewGame: (gameData) =>
    set((state) => ({
      currentGame: {
        id: '', // Doplní se po uložení
        creator_id: '',
        title: gameData.title,
        description: gameData.description || null,
        is_public: gameData.is_public,
        difficulty: gameData.difficulty,
        tags: gameData.tags ?? [],
        settings: toGameSettings(gameData.settings),
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      // Návrat z mapy na základní info u rozpracované nové hry nesmí smazat rozmístěné body
      tempCheckpoints: state.currentGame && !state.currentGame.id ? state.tempCheckpoints : [],
    })),

  // Načtení hry z API podle ID (pro URL routing)
  loadGame: async (gameId: string) => {
    // Odpověď pro hru, kterou mezitím nahradila jiná (nebo editor zavřel), se zahodí –
    // jinak by pod URL hry B skončila data hry A
    const requestId = ++loadRequestId;

    try {
      set({ isLoading: true, loadError: null });
      // Editor pracuje jen s online daty – úprava zastaralé offline kopie by po uložení
      // přepsala novější stav v DB
      const [gameData, checkpoints] = await Promise.all([
        getGameById(gameId, { offlineFallback: false }),
        getCheckpointsWithSecrets(gameId),
      ]);
      if (requestId !== loadRequestId) return;

      set({
        currentGame: gameData,
        tempCheckpoints: checkpoints.map(toTempCheckpoint),
        selectedCheckpointId: null,
        isLoading: false,
      });
    } catch (err) {
      if (requestId !== loadRequestId) return;
      set({
        isLoading: false,
        loadError: toUserMessage(err, 'Chyba při načítání hry'),
      });
    }
  },

  // Aktualizace základních informací hry (při editaci)
  updateCurrentGame: (gameData) =>
    set((state) => ({
      currentGame: state.currentGame
        ? {
            ...state.currentGame,
            title: gameData.title,
            description: gameData.description || null,
            is_public: gameData.is_public,
            difficulty: gameData.difficulty,
            tags: gameData.tags ?? state.currentGame.tags ?? [],
            settings: toGameSettings(gameData.settings),
          }
        : null,
    })),

  addTempCheckpoint: (latitude, longitude) => {
    const tempCheckpoints = get().tempCheckpoints;
    const newCheckpoint: TempCheckpoint = {
      tempId: `temp-${Date.now()}`,
      order_index: tempCheckpoints.length,
      latitude,
      longitude,
      radius: 10,
      type: 'info',
      content: {
        title: `Checkpoint ${tempCheckpoints.length + 1}`,
        description: '',
        image_url: null,
        clue: null,
      },
      secret_solution: null,
      puzzle_answer: null,
    };

    set({
      tempCheckpoints: [...tempCheckpoints, newCheckpoint],
      selectedCheckpointId: newCheckpoint.tempId,
    });
  },

  updateTempCheckpoint: (tempId, updates) =>
    set((state) => ({
      tempCheckpoints: state.tempCheckpoints.map((cp) =>
        cp.tempId === tempId ? { ...cp, ...updates } : cp
      ),
    })),

  deleteTempCheckpoint: (tempId) =>
    set((state) => {
      const filtered = state.tempCheckpoints.filter((cp) => cp.tempId !== tempId);
      return {
        // Přečíslovat pořadí
        tempCheckpoints: filtered.map((cp, index) => ({ ...cp, order_index: index })),
        selectedCheckpointId:
          state.selectedCheckpointId === tempId ? null : state.selectedCheckpointId,
      };
    }),

  reorderCheckpoints: (fromIndex, toIndex) =>
    set((state) => {
      const checkpoints = [...state.tempCheckpoints];
      const [moved] = checkpoints.splice(fromIndex, 1);
      checkpoints.splice(toIndex, 0, moved);
      return {
        tempCheckpoints: checkpoints.map((cp, index) => ({ ...cp, order_index: index })),
      };
    }),

  setSavedCheckpoints: (checkpoints) =>
    set({ tempCheckpoints: checkpoints.map(toTempCheckpoint), selectedCheckpointId: null }),

  selectCheckpoint: (tempId) => set({ selectedCheckpointId: tempId }),

  reset: () => {
    loadRequestId++;
    set({
      currentGame: null,
      tempCheckpoints: [],
      selectedCheckpointId: null,
      isLoading: false,
      loadError: null,
    });
  },
}));
