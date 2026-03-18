// Hook pro uložení hry a checkpointů do databáze
// Extrahováno z AdminEditPage – sdílená logika pro vytvoření i aktualizaci hry

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCheckpoint,
  createGame,
  deleteCheckpoint,
  deleteGame,
  updateCheckpoint,
  updateGame,
} from '../../../lib/api';
import { useGameEditorStore } from '../store/gameEditorStore';

interface UseSaveGameReturn {
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  saveNewGame: () => Promise<void>;
  updateExistingGame: () => Promise<void>;
  clearMessages: () => void;
}

export function useSaveGame(): UseSaveGameReturn {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { currentGame, tempCheckpoints, deletedCheckpointIds, reset } = useGameEditorStore();

  const saveNewGame = async () => {
    if (!currentGame) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      // 1. Vytvorit hru
      const createdGame = await createGame({
        title: currentGame.title,
        description: currentGame.description || undefined,
        is_public: currentGame.is_public,
        difficulty: currentGame.difficulty,
        settings: currentGame.settings,
      });

      // 2. Vytvorit vsechny checkpointy – rollback (smazat hru) pokud selze
      try {
        for (const checkpoint of tempCheckpoints) {
          await createCheckpoint({
            game_id: createdGame.id,
            order_index: checkpoint.order_index,
            latitude: checkpoint.latitude,
            longitude: checkpoint.longitude,
            radius: checkpoint.radius,
            type: checkpoint.type,
            content: checkpoint.content,
            secret_solution: checkpoint.secret_solution || undefined,
          });
        }
      } catch (checkpointErr) {
        // Rollback – smazat hru pokud selze vytvoreni checkpointu
        await deleteGame(createdGame.id).catch((_rollbackErr) => {
          // Rollback selhal – hra zůstane v DB bez checkpointů, uživatel může smazat ručně
        });
        throw checkpointErr;
      }

      setSuccessMessage(`Hra "${createdGame.title}" byla uspesne vytvorena!`);
      reset();
      navigate('/admin');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba pri ukladani hry');
    } finally {
      setIsSaving(false);
    }
  };

  const updateExistingGame = async () => {
    if (!currentGame?.id) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      // 1. Update game details
      await updateGame(currentGame.id, {
        title: currentGame.title,
        description: currentGame.description || undefined,
        is_public: currentGame.is_public,
        difficulty: currentGame.difficulty,
        settings: currentGame.settings,
      });

      // 2. Handle checkpoints - update existing, create new
      const existingCheckpoints = tempCheckpoints.filter((cp) => cp.id);
      const newCheckpoints = tempCheckpoints.filter((cp) => !cp.id);

      for (const checkpoint of existingCheckpoints) {
        await updateCheckpoint(checkpoint.id!, {
          order_index: checkpoint.order_index,
          latitude: checkpoint.latitude,
          longitude: checkpoint.longitude,
          radius: checkpoint.radius,
          type: checkpoint.type,
          content: checkpoint.content,
          secret_solution: checkpoint.secret_solution || undefined,
        });
      }

      for (const checkpoint of newCheckpoints) {
        await createCheckpoint({
          game_id: currentGame.id,
          order_index: checkpoint.order_index,
          latitude: checkpoint.latitude,
          longitude: checkpoint.longitude,
          radius: checkpoint.radius,
          type: checkpoint.type,
          content: checkpoint.content,
          secret_solution: checkpoint.secret_solution || undefined,
        });
      }

      // 3. Smazat checkpointy odebrane behem editace
      for (const id of deletedCheckpointIds) {
        await deleteCheckpoint(id);
      }

      setSuccessMessage(`Hra "${currentGame.title}" byla uspesne aktualizovana!`);
      reset();
      navigate('/admin');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba pri ukladani zmen');
    } finally {
      setIsSaving(false);
    }
  };

  const clearMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  return {
    isSaving,
    errorMessage,
    successMessage,
    saveNewGame,
    updateExistingGame,
    clearMessages,
  };
}
