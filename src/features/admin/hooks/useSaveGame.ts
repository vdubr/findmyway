// Hook pro uložení hry a checkpointů do databáze
// Extrahováno z AdminEditPage – sdílená logika pro vytvoření i aktualizaci hry

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCheckpoint,
  createGame,
  deleteCheckpoint,
  deleteGame,
  shiftCheckpointOrderIndex,
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

  const reset = useGameEditorStore((state) => state.reset);

  const saveNewGame = async () => {
    const { currentGame, tempCheckpoints } = useGameEditorStore.getState();
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
        tags: currentGame.tags,
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
            is_fake: checkpoint.is_fake ?? false,
          });
        }
      } catch (checkpointErr) {
        // Rollback – smazat hru pokud selze vytvoreni checkpointu
        await deleteGame(createdGame.id).catch((_rollbackErr) => {
          // Rollback selhal – hra zůstane v DB bez checkpointů, uživatel může smazat ručně
        });
        throw checkpointErr;
      }

      setSuccessMessage(`Hra "${createdGame.title}" byla úspěšně vytvořena!`);
      reset();
      navigate(`/games/${createdGame.id}/edit/base`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba při ukládání hry');
    } finally {
      setIsSaving(false);
    }
  };

  const updateExistingGame = async () => {
    const { currentGame, tempCheckpoints, deletedCheckpointIds, updateTempCheckpoint } =
      useGameEditorStore.getState();
    if (!currentGame?.id) return;

    // Formulář základního info se synchronizuje průběžně, validace ale běží jen při jeho odeslání
    if (currentGame.title.trim().length < 3) {
      setErrorMessage('Název hry musí mít alespoň 3 znaky (záložka Základní info).');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      // 1. Update game details (null = popis smazaný, undefined by sloupec nezměnil)
      await updateGame(currentGame.id, {
        title: currentGame.title,
        description: currentGame.description || null,
        is_public: currentGame.is_public,
        difficulty: currentGame.difficulty,
        settings: currentGame.settings,
        tags: currentGame.tags,
      });

      // 2. Nejdřív smazat odebrané checkpointy – jinak by jejich order_index kolidoval
      // s přečíslovanými zbývajícími body (UNIQUE game_id + order_index)
      for (const id of deletedCheckpointIds) {
        await deleteCheckpoint(id);
      }

      // 3. Handle checkpoints - update existing, create new
      const existingCheckpoints = tempCheckpoints.filter((cp) => cp.id);
      const newCheckpoints = tempCheckpoints.filter((cp) => !cp.id);

      // Dvouprůchodové uložení order_index – vyhnutí se unique constraint porušení.
      // Průchod 1: přesunout na dočasná velká čísla (10000+), aby se předešlo konfliktům.
      const TEMP_OFFSET = 10000;
      for (let i = 0; i < existingCheckpoints.length; i++) {
        await shiftCheckpointOrderIndex(existingCheckpoints[i].id!, TEMP_OFFSET + i);
      }

      // Průchod 2: nastavit skutečné hodnoty
      for (const checkpoint of existingCheckpoints) {
        await updateCheckpoint(checkpoint.id!, {
          order_index: checkpoint.order_index,
          latitude: checkpoint.latitude,
          longitude: checkpoint.longitude,
          radius: checkpoint.radius,
          type: checkpoint.type,
          content: checkpoint.content,
          // null = řešení odebrané, undefined by sloupec nezměnil
          secret_solution: checkpoint.secret_solution ?? null,
          is_fake: checkpoint.is_fake ?? false,
        });
      }

      for (const checkpoint of newCheckpoints) {
        const created = await createCheckpoint({
          game_id: currentGame.id,
          order_index: checkpoint.order_index,
          latitude: checkpoint.latitude,
          longitude: checkpoint.longitude,
          radius: checkpoint.radius,
          type: checkpoint.type,
          content: checkpoint.content,
          secret_solution: checkpoint.secret_solution || undefined,
          is_fake: checkpoint.is_fake ?? false,
        });
        // Zapsat ID zpět – při opakovaném uložení po chybě se bod nevytvoří podruhé
        updateTempCheckpoint(checkpoint.tempId, { id: created.id });
      }

      reset();
      navigate(`/games/${currentGame.id}`, {
        state: { successMessage: `Hra "${currentGame.title}" byla úspěšně aktualizována!` },
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba při ukládání změn');
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
