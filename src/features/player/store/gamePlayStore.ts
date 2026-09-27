// Zustand store pro herní stav během hraní
import { create } from 'zustand';
import { completeGameSession, updateSessionProgress } from '../../../lib/api';
import type {
  Checkpoint,
  CheckpointCompletion,
  Game,
  GameSession,
  GPSPosition,
  SessionMetadata,
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
  // checkpointId: pojistka proti dvojímu splnění – akce se ignoruje, pokud už je aktuální jiný bod
  completeCurrentCheckpoint: (checkpointId?: string) => void;
  skipCheckpoint: (checkpointId?: string) => void;
  showCheckpoint: () => void;
  hideCheckpoint: () => void;
  resetGame: () => void;
}

const EMPTY_METADATA: SessionMetadata = {
  hints_used: 0,
  wrong_attempts: 0,
  checkpoints_completed: [],
};

// Zápisy postupu do session běží za sebou, aby rychlé přeskakování nepřepsalo novější stav starším
let persistQueue: Promise<unknown> = Promise.resolve();

function persistProgress(task: () => Promise<unknown>) {
  persistQueue = persistQueue.then(task).catch((err) => {
    // Neuložený postup nesmí zastavit hru – hráč pokračuje, jen se postup neobnoví po reloadu
    console.warn('Nepodařilo se uložit postup hry:', err);
  });
}

export const useGamePlayStore = create<GamePlayState>((set, get) => {
  // Posun na další checkpoint (splněný nebo přeskočený) a uložení postupu do session
  const advanceCheckpoint = (skipped: boolean, checkpointId?: string) => {
    const { currentCheckpoint, currentCheckpointIndex, checkpoints, session, showVictory } = get();
    if (!currentCheckpoint || showVictory) return;
    if (checkpointId && checkpointId !== currentCheckpoint.id) return;

    const nextIndex = currentCheckpointIndex + 1;
    const isLast = nextIndex >= checkpoints.length;

    if (session) {
      const metadata = session.metadata ?? EMPTY_METADATA;
      const completedIds = metadata.checkpoints_completed ?? [];
      const nextMetadata: SessionMetadata = {
        ...metadata,
        checkpoints_completed: skipped ? completedIds : [...completedIds, currentCheckpoint.id],
      };
      const savedIndex = isLast ? currentCheckpointIndex : nextIndex;
      // Skóre = počet checkpointů splněných bez přeskočení
      const score = nextMetadata.checkpoints_completed.length;

      set({
        session: { ...session, current_checkpoint_index: savedIndex, metadata: nextMetadata },
      });
      persistProgress(async () => {
        await updateSessionProgress(session.id, savedIndex, nextMetadata);
        if (isLast) await completeGameSession(session.id, score);
      });
    }

    if (isLast) {
      set({
        showVictory: true,
        showCheckpointContent: false,
      });
      return;
    }

    set({
      currentCheckpointIndex: nextIndex,
      currentCheckpoint: checkpoints[nextIndex],
      showCheckpointContent: false,
      checkpointReached: false,
      isInCheckpointRadius: false,
      distanceToCheckpoint: null,
    });

    // Přepočítat vzdálenost k novému bodu hned, ne až při dalším GPS fixu
    const position = get().userPosition;
    if (position) get().updateUserPosition(position);
  };

  return {
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
      // Index ze session omezit na platný rozsah (admin mohl mezitím checkpointy smazat)
      const maxIndex = Math.max(checkpoints.length - 1, 0);
      const index = Math.min(Math.max(session.current_checkpoint_index ?? 0, 0), maxIndex);
      set({
        game,
        checkpoints,
        session,
        currentCheckpointIndex: index,
        currentCheckpoint: checkpoints[index] ?? null,
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
      const radiusTolerance = game.settings?.radius_tolerance ?? 10;
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

    completeCurrentCheckpoint: (checkpointId) => {
      advanceCheckpoint(false, checkpointId);
    },

    skipCheckpoint: (checkpointId) => {
      const { game } = get();
      if (!game?.settings.allow_skip) return;

      advanceCheckpoint(true, checkpointId);
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
  };
});
