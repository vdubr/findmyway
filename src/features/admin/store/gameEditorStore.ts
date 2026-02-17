// Zustand store pro správu stavu při vytváření/editaci hry
import { create } from 'zustand';
import type {
  Game,
  CreateGameInput,
  CheckpointType,
  CheckpointContent,
  SecretSolution,
} from '../../../types';

// Temporary checkpoint (před uložením do DB)
export interface TempCheckpoint {
  tempId: string; // Dočasné ID před uložením do DB
  id?: string; // Reálné ID po uložení
  order_index: number;
  latitude: number;
  longitude: number;
  radius: number;
  type: CheckpointType;
  content: CheckpointContent;
  secret_solution: SecretSolution | null;
  is_fake?: boolean; // Fake checkpoint (nebude se počítat k dokončení)
}

interface GameEditorState {
  // Current game being edited
  currentGame: Game | null;

  // Temporary checkpoints (během editace)
  tempCheckpoints: TempCheckpoint[];

  // Selected checkpoint for editing
  selectedCheckpointId: string | null;

  // UI state
  isMapEditorOpen: boolean;
  isCheckpointEditorOpen: boolean;
  isSaving: boolean;

  // Actions
  setCurrentGame: (game: Game | null) => void;
  initNewGame: (gameData: CreateGameInput) => void;
  initEditGame: (game: Game, checkpoints: any[]) => void;

  // Checkpoint management
  addTempCheckpoint: (latitude: number, longitude: number) => void;
  updateTempCheckpoint: (tempId: string, updates: Partial<TempCheckpoint>) => void;
  deleteTempCheckpoint: (tempId: string) => void;
  reorderCheckpoints: (fromIndex: number, toIndex: number) => void;

  // Selected checkpoint
  selectCheckpoint: (tempId: string | null) => void;

  // UI toggles
  toggleMapEditor: () => void;
  toggleCheckpointEditor: () => void;

  // Reset
  reset: () => void;
}

export const useGameEditorStore = create<GameEditorState>((set, get) => ({
  currentGame: null,
  tempCheckpoints: [],
  selectedCheckpointId: null,
  isMapEditorOpen: false,
  isCheckpointEditorOpen: false,
  isSaving: false,

  setCurrentGame: (game) => set({ currentGame: game }),

  initNewGame: (gameData) =>
    set({
      currentGame: {
        id: '', // Will be set after save
        creator_id: '',
        title: gameData.title,
        description: gameData.description || null,
        is_public: gameData.is_public,
        difficulty: gameData.difficulty,
        settings: {
          radius_tolerance: gameData.settings?.radius_tolerance || 10,
          allow_skip: gameData.settings?.allow_skip || false,
          max_players: gameData.settings?.max_players || null,
          time_limit: gameData.settings?.time_limit || null,
        },
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      tempCheckpoints: [],
      isMapEditorOpen: true,
    }),

  initEditGame: (game, checkpoints) =>
    set({
      currentGame: game,
      tempCheckpoints: checkpoints.map((cp) => ({
        tempId: cp.id, // Use real ID as tempId for existing checkpoints
        id: cp.id,
        order_index: cp.order_index,
        latitude: cp.latitude,
        longitude: cp.longitude,
        radius: cp.radius,
        type: cp.type,
        content: cp.content,
        secret_solution: cp.secret_solution,
        is_fake: cp.is_fake,
      })),
      selectedCheckpointId: null,
      isMapEditorOpen: true,
    }),

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
    };

    set({
      tempCheckpoints: [...tempCheckpoints, newCheckpoint],
      selectedCheckpointId: newCheckpoint.tempId,
      isCheckpointEditorOpen: true,
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
      // Reindex order
      const reindexed = filtered.map((cp, index) => ({
        ...cp,
        order_index: index,
      }));

      return {
        tempCheckpoints: reindexed,
        selectedCheckpointId:
          state.selectedCheckpointId === tempId ? null : state.selectedCheckpointId,
      };
    }),

  reorderCheckpoints: (fromIndex, toIndex) =>
    set((state) => {
      const checkpoints = [...state.tempCheckpoints];
      const [moved] = checkpoints.splice(fromIndex, 1);
      checkpoints.splice(toIndex, 0, moved);

      // Update order_index
      const reindexed = checkpoints.map((cp, index) => ({
        ...cp,
        order_index: index,
      }));

      return { tempCheckpoints: reindexed };
    }),

  selectCheckpoint: (tempId) =>
    set({
      selectedCheckpointId: tempId,
      isCheckpointEditorOpen: tempId !== null,
    }),

  toggleMapEditor: () => set((state) => ({ isMapEditorOpen: !state.isMapEditorOpen })),

  toggleCheckpointEditor: () =>
    set((state) => ({ isCheckpointEditorOpen: !state.isCheckpointEditorOpen })),

  reset: () =>
    set({
      currentGame: null,
      tempCheckpoints: [],
      selectedCheckpointId: null,
      isMapEditorOpen: false,
      isCheckpointEditorOpen: false,
      isSaving: false,
    }),
}));
