// Zustand store pro herní stav během hraní
import { create } from 'zustand';
import type {
  Checkpoint,
  CheckpointCompletion,
  Game,
  GameSession,
  GPSPosition,
} from '../../../types';
import { calculateDistance } from '../../../utils/geo';

interface GamePlayState {
  // Current game data
  game: Game | null;
  checkpoints: Checkpoint[];
  session: GameSession | null;

  // Player position
  userPosition: GPSPosition | null;

  // Current checkpoint
  currentCheckpointIndex: number;
  currentCheckpoint: Checkpoint | null;

  // Distance to current checkpoint
  distanceToCheckpoint: number | null;

  // Checkpoint reached state
  isInCheckpointRadius: boolean;
  checkpointReached: boolean;

  // Completions
  completions: CheckpointCompletion[];

  // UI state
  showCheckpointContent: boolean;
  showVictory: boolean;

  // Actions
  initGame: (game: Game, checkpoints: Checkpoint[], session: GameSession) => void;
  updateUserPosition: (position: GPSPosition) => void;
  completeCurrentCheckpoint: () => void;
  skipCheckpoint: () => void;
  showCheckpoint: () => void;
  hideCheckpoint: () => void;
  resetGame: () => void;
}

export const useGamePlayStore = create<GamePlayState>((set, get) => ({
  game: null,
  checkpoints: [],
  session: null,
  userPosition: null,
  currentCheckpointIndex: 0,
  currentCheckpoint: null,
  distanceToCheckpoint: null,
  isInCheckpointRadius: false,
  checkpointReached: false,
  completions: [],
  showCheckpointContent: false,
  showVictory: false,

  initGame: (game, checkpoints, session) => {
    const firstCheckpoint = checkpoints[0] || null;
    set({
      game,
      checkpoints,
      session,
      currentCheckpointIndex: session.current_checkpoint_index,
      currentCheckpoint: checkpoints[session.current_checkpoint_index] || firstCheckpoint,
      showCheckpointContent: false,
      showVictory: false,
      isInCheckpointRadius: false,
      checkpointReached: false,
    });
  },

  updateUserPosition: (position) => {
    const { currentCheckpoint, game } = get();

    set({ userPosition: position });

    if (!currentCheckpoint || !game) return;

    // Calculate distance to current checkpoint
    const distance = calculateDistance(
      { latitude: position.latitude, longitude: position.longitude },
      { latitude: currentCheckpoint.latitude, longitude: currentCheckpoint.longitude }
    );

    set({ distanceToCheckpoint: distance });

    // Check if in radius
    const radiusTolerance = game.settings.radius_tolerance || 10;
    const totalRadius = currentCheckpoint.radius + radiusTolerance;
    const inRadius = distance <= totalRadius;

    const wasInRadius = get().isInCheckpointRadius;

    set({ isInCheckpointRadius: inRadius });

    // Auto-show checkpoint content when entering radius for the first time
    if (inRadius && !wasInRadius && !get().checkpointReached) {
      set({
        checkpointReached: true,
        showCheckpointContent: true,
      });
    }
  },

  completeCurrentCheckpoint: () => {
    const { currentCheckpointIndex, checkpoints } = get();

    const nextIndex = currentCheckpointIndex + 1;

    // Check if game is complete
    if (nextIndex >= checkpoints.length) {
      set({
        showVictory: true,
        showCheckpointContent: false,
      });
      return;
    }

    // Move to next checkpoint
    const nextCheckpoint = checkpoints[nextIndex];
    set({
      currentCheckpointIndex: nextIndex,
      currentCheckpoint: nextCheckpoint,
      showCheckpointContent: false,
      checkpointReached: false,
      isInCheckpointRadius: false,
      distanceToCheckpoint: null,
    });
  },

  skipCheckpoint: () => {
    const { game } = get();
    if (!game?.settings.allow_skip) return;

    get().completeCurrentCheckpoint();
  },

  showCheckpoint: () => set({ showCheckpointContent: true }),

  hideCheckpoint: () => set({ showCheckpointContent: false }),

  resetGame: () =>
    set({
      game: null,
      checkpoints: [],
      session: null,
      userPosition: null,
      currentCheckpointIndex: 0,
      currentCheckpoint: null,
      distanceToCheckpoint: null,
      isInCheckpointRadius: false,
      checkpointReached: false,
      completions: [],
      showCheckpointContent: false,
      showVictory: false,
    }),
}));
