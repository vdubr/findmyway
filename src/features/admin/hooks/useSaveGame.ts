// Hook pro uložení hry a checkpointů do databáze
// Sdílená logika pro vytvoření i aktualizaci hry (AdminEditPage)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, deleteGame, saveGameCheckpoints, updateGame } from '../../../lib/api';
import { toUserMessage } from '../../../lib/errors';
import { toSaveCheckpointInput, useGameEditorStore } from '../store/gameEditorStore';

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

      // 1. Vytvořit hru
      const createdGame = await createGame({
        title: currentGame.title,
        description: currentGame.description || undefined,
        is_public: currentGame.is_public,
        difficulty: currentGame.difficulty,
        tags: currentGame.tags,
        settings: currentGame.settings,
      });

      // 2. Checkpointy jedním RPC (transakce) – při selhání smazat hru, ať nezůstane prázdná
      try {
        await saveGameCheckpoints(createdGame.id, tempCheckpoints.map(toSaveCheckpointInput));
      } catch (checkpointErr) {
        await deleteGame(createdGame.id).catch(() => {
          // Rollback selhal – hra zůstane v DB bez checkpointů, uživatel ji může smazat ručně
        });
        throw checkpointErr;
      }

      setSuccessMessage(`Hra "${createdGame.title}" byla úspěšně vytvořena!`);
      reset();
      navigate(`/games/${createdGame.id}/edit/base`);
    } catch (err) {
      setErrorMessage(toUserMessage(err, 'Chyba při ukládání hry'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateExistingGame = async () => {
    const { currentGame, tempCheckpoints } = useGameEditorStore.getState();
    if (!currentGame?.id) return;

    // Formulář základního info se synchronizuje průběžně, validace ale běží jen při jeho odeslání
    if (currentGame.title.trim().length < 3) {
      setErrorMessage('Název hry musí mít alespoň 3 znaky (záložka Základní info).');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      // 1. Údaje hry (null = popis smazaný, undefined by sloupec nezměnil)
      await updateGame(currentGame.id, {
        title: currentGame.title,
        description: currentGame.description || null,
        is_public: currentGame.is_public,
        difficulty: currentGame.difficulty,
        settings: currentGame.settings,
        tags: currentGame.tags,
      });

      // 2. Všechny checkpointy jedním RPC v jedné transakci: update, insert, delete i řešení úkolů
      await saveGameCheckpoints(currentGame.id, tempCheckpoints.map(toSaveCheckpointInput));

      reset();
      navigate(`/games/${currentGame.id}`, {
        state: { successMessage: `Hra "${currentGame.title}" byla úspěšně aktualizována!` },
      });
    } catch (err) {
      setErrorMessage(toUserMessage(err, 'Chyba při ukládání změn'));
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
