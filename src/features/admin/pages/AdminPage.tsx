// Admin Panel - správa her

import { Add as AddIcon } from '@mui/icons-material';
import { Alert, Box, Button, Container, Snackbar, Stack, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import {
  createCheckpoint,
  createGame,
  getCheckpointsByGameId,
  updateCheckpoint,
  updateGame,
} from '../../../lib/api';
import type { CreateGameInput, Game } from '../../../types';
import CheckpointEditor from '../components/CheckpointEditor';
import DemoPlayer from '../components/DemoPlayer';
import GameCreatorForm from '../components/GameCreatorForm';
import GameList from '../components/GameList';
import MapEditor from '../components/MapEditor';
import { useGameEditorStore } from '../store/gameEditorStore';

type AdminView = 'list' | 'create' | 'edit';
type CreateStep = 'form' | 'map' | 'demo';

export default function AdminPage() {
  const [currentView, setCurrentView] = useState<AdminView>('list');
  const [createStep, setCreateStep] = useState<CreateStep>('form');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    currentGame,
    tempCheckpoints,
    selectedCheckpointId,
    initNewGame,
    initEditGame,
    updateCurrentGame,
    selectCheckpoint,
    reset,
  } = useGameEditorStore();

  // Začít vytváření nové hry
  const handleCreateNew = () => {
    reset();
    setCurrentView('create');
    setCreateStep('form');
  };

  // Zpracovat formulář nové hry
  const handleGameFormSubmit = async (gameData: CreateGameInput) => {
    initNewGame(gameData);
    setCreateStep('map');
  };

  // Zpracovat formulář při editaci existující hry
  const handleEditFormSubmit = async (gameData: CreateGameInput) => {
    updateCurrentGame(gameData);
    setCreateStep('map');
  };

  // Uložit hru a checkpointy do databáze
  const handleSaveGame = async () => {
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
        settings: currentGame.settings,
      });

      // 2. Vytvořit všechny checkpointy
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

      setSuccessMessage(`Hra "${createdGame.title}" byla úspěšně vytvořena!`);
      reset();
      setCurrentView('list');
      setCreateStep('form');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba při ukládání hry');
    } finally {
      setIsSaving(false);
    }
  };

  // Editovat existující hru
  const handleEditGame = async (game: Game) => {
    try {
      setErrorMessage(null);
      const checkpoints = await getCheckpointsByGameId(game.id);
      initEditGame(game, checkpoints);
      setCurrentView('edit');
      setCreateStep('form'); // Zaciname na formulari, aby uzivatel mohl editovat zakladni info
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba při načítání checkpointů');
    }
  };

  // Uložit změny v existující hře
  const handleUpdateGame = async () => {
    if (!currentGame || !currentGame.id) return;

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

      // 2. Handle checkpoints - update existing, create new, delete removed
      const existingCheckpoints = tempCheckpoints.filter((cp) => cp.id);
      const newCheckpoints = tempCheckpoints.filter((cp) => !cp.id);

      // Update existing checkpoints
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

      // Create new checkpoints
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

      // TODO: Delete removed checkpoints (need to track which were deleted)

      setSuccessMessage(`Hra "${currentGame.title}" byla úspěšně aktualizována!`);
      reset();
      setCurrentView('list');
      setCreateStep('form');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba při ukládání změn');
    } finally {
      setIsSaving(false);
    }
  };

  // Zrušit vytváření/editaci
  const handleCancel = () => {
    reset();
    setCurrentView('list');
    setCreateStep('form');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        {currentView === 'list' && (
          <Stack direction="row" justifyContent="flex-end" mb={4}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleCreateNew}
            >
              Nova hra
            </Button>
          </Stack>
        )}

        {/* Content */}
        {currentView === 'list' && <GameList onEdit={handleEditGame} />}

        {currentView === 'create' && (
          <Box>
            {/* Step indicator */}
            <Tabs value={createStep} sx={{ mb: 3 }} onChange={(_, value) => setCreateStep(value)}>
              <Tab label="1. Základní info" value="form" disabled={createStep === 'map'} />
              <Tab label="2. Checkpointy" value="map" disabled={createStep === 'form'} />
            </Tabs>

            {/* Step content */}
            {createStep === 'form' && (
              <GameCreatorForm onSubmit={handleGameFormSubmit} onCancel={handleCancel} />
            )}

            {createStep === 'map' && (
              <>
                <MapEditor onSave={handleSaveGame} isLoading={isSaving} />
                <CheckpointEditor
                  open={selectedCheckpointId !== null}
                  onClose={() => selectCheckpoint(null)}
                />
              </>
            )}
          </Box>
        )}

        {currentView === 'edit' && (
          <Box>
            {/* Step indicator - stejne jako pri vytvareni */}
            <Tabs value={createStep} sx={{ mb: 3 }} onChange={(_, value) => setCreateStep(value)}>
              <Tab label="1. Základní info" value="form" />
              <Tab label="2. Checkpointy" value="map" />
              <Tab label="3. Demo" value="demo" disabled={tempCheckpoints.length === 0} />
            </Tabs>

            {/* Step content */}
            {createStep === 'form' && currentGame && (
              <GameCreatorForm
                initialValues={{
                  title: currentGame.title,
                  description: currentGame.description || '',
                  is_public: currentGame.is_public,
                  difficulty: currentGame.difficulty,
                  settings: currentGame.settings,
                }}
                onSubmit={handleEditFormSubmit}
                onCancel={handleCancel}
                isEditMode
              />
            )}

            {createStep === 'map' && (
              <>
                <MapEditor onSave={handleUpdateGame} isLoading={isSaving} />
                <CheckpointEditor
                  open={selectedCheckpointId !== null}
                  onClose={() => selectCheckpoint(null)}
                />
              </>
            )}

            {createStep === 'demo' && currentGame && (
              <DemoPlayer
                game={currentGame}
                tempCheckpoints={tempCheckpoints}
                onExit={() => setCreateStep('map')}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Success/Error notifications */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar open={!!errorMessage} autoHideDuration={6000} onClose={() => setErrorMessage(null)}>
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
