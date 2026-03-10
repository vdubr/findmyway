// Editace existujici hry - wrapper s URL routovanim
// Nacte hru podle gameId z URL a zobrazuje taby (base/checkpoints/demo)

import { Alert, Box, Container, Snackbar, Tab, Tabs } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorDisplay from '../../../components/ErrorDisplay';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { createCheckpoint, createGame, updateCheckpoint, updateGame } from '../../../lib/api';
import type { CreateGameInput } from '../../../types';
import CheckpointEditor from '../components/CheckpointEditor';
import DemoPlayer from '../components/DemoPlayer';
import GameCreatorForm from '../components/GameCreatorForm';
import MapEditor from '../components/MapEditor';
import { useGameEditorStore } from '../store/gameEditorStore';

// Mapovani URL segmentu na tab hodnoty
type TabValue = 'base' | 'checkpoints' | 'demo';

// Validni URL segmenty pro taby
const VALID_TABS: TabValue[] = ['base', 'checkpoints', 'demo'];

export default function AdminEditPage() {
  const { gameId, tab } = useParams<{ gameId: string; tab: string }>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    currentGame,
    tempCheckpoints,
    selectedCheckpointId,
    isLoading,
    loadError,
    loadGame,
    initNewGame,
    updateCurrentGame,
    selectCheckpoint,
    reset,
  } = useGameEditorStore();

  // Aktualni tab z URL (default: base)
  const currentTab: TabValue = VALID_TABS.includes(tab as TabValue) ? (tab as TabValue) : 'base';

  // Je to nova hra?
  const isNewGame = gameId === 'new';

  // Nacist hru z API pri mountu (jen pro existujici hry)
  useEffect(() => {
    if (!isNewGame && gameId) {
      loadGame(gameId);
    }
    // Cleanup pri odchodu ze stranky
    return () => {
      // Reset jen pokud odchazime uplne pryc z admin edit
      // (ne pri prepinani tabu)
    };
  }, [gameId, isNewGame, loadGame]);

  // Redirect na /base pokud je nevalidni tab
  useEffect(() => {
    if (tab && !VALID_TABS.includes(tab as TabValue)) {
      navigate(`/admin/${gameId}/base`, { replace: true });
    }
  }, [tab, gameId, navigate]);

  // Prepnuti tabu
  const handleTabChange = (_: React.SyntheticEvent, newValue: TabValue) => {
    navigate(`/admin/${gameId}/${newValue}`);
  };

  // Zpracovat formular - nova hra
  const handleNewGameFormSubmit = async (gameData: CreateGameInput) => {
    initNewGame(gameData);
    navigate(`/admin/new/checkpoints`);
  };

  // Zpracovat formular - editace existujici hry
  const handleEditFormSubmit = async (gameData: CreateGameInput) => {
    updateCurrentGame(gameData);
    navigate(`/admin/${gameId}/checkpoints`);
  };

  // Ulozit novou hru a checkpointy do databaze
  const handleSaveNewGame = async () => {
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

      // 2. Vytvorit vsechny checkpointy
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

      setSuccessMessage(`Hra "${createdGame.title}" byla uspesne vytvorena!`);
      reset();
      navigate('/admin');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba pri ukladani hry');
    } finally {
      setIsSaving(false);
    }
  };

  // Ulozit zmeny v existujici hre
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

      // 2. Handle checkpoints - update existing, create new
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

      setSuccessMessage(`Hra "${currentGame.title}" byla uspesne aktualizovana!`);
      reset();
      navigate('/admin');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Chyba pri ukladani zmen');
    } finally {
      setIsSaving(false);
    }
  };

  // Zrusit editaci
  const handleCancel = () => {
    reset();
    navigate('/admin');
  };

  // Loading stav
  if (!isNewGame && isLoading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <LoadingSpinner />
        </Box>
      </Container>
    );
  }

  // Chyba pri nacitani
  if (!isNewGame && loadError) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <ErrorDisplay message={loadError} />
        </Box>
      </Container>
    );
  }

  // Rozhodnout jestli jde o save nove hry nebo update existujici
  const handleSave = isNewGame ? handleSaveNewGame : handleUpdateGame;
  const handleFormSubmit = isNewGame ? handleNewGameFormSubmit : handleEditFormSubmit;

  return (
    <Container
      maxWidth="xl"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // Pro checkpoints tab - zabrat celou dostupnou vysku, nescrollovat
        ...(currentTab === 'checkpoints' && {
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }),
      }}
    >
      {/* Taby navigace - zafixovane nahoze */}
      <Box
        sx={{
          bgcolor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        {isNewGame ? (
          // Nova hra - jednosmerne taby (form -> checkpoints)
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="1. Zakladni info" value="base" disabled={currentTab === 'checkpoints'} />
            <Tab label="2. Checkpointy" value="checkpoints" disabled={currentTab === 'base'} />
          </Tabs>
        ) : (
          // Existujici hra - volne prepinatelne taby
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="1. Zakladni info" value="base" />
            <Tab label="2. Checkpointy" value="checkpoints" />
            <Tab label="3. Demo" value="demo" disabled={tempCheckpoints.length === 0} />
          </Tabs>
        )}
      </Box>

      {/* Obsah tabu */}
      {currentTab === 'base' && (
        <Box sx={{ py: 3 }}>
          {isNewGame && !currentGame ? (
            <GameCreatorForm onSubmit={handleFormSubmit} onCancel={handleCancel} />
          ) : (
            currentGame && (
              <GameCreatorForm
                initialValues={{
                  title: currentGame.title,
                  description: currentGame.description || '',
                  is_public: currentGame.is_public,
                  difficulty: currentGame.difficulty,
                  settings: currentGame.settings,
                }}
                onSubmit={handleFormSubmit}
                onCancel={handleCancel}
                isEditMode={!isNewGame}
              />
            )
          )}
        </Box>
      )}

      {currentTab === 'checkpoints' && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            pt: 2,
            pb: 1,
          }}
        >
          <MapEditor onSave={handleSave} isLoading={isSaving} />
          <CheckpointEditor
            open={selectedCheckpointId !== null}
            onClose={() => selectCheckpoint(null)}
          />
        </Box>
      )}

      {currentTab === 'demo' && currentGame && !isNewGame && (
        <Box sx={{ py: 3 }}>
          <DemoPlayer
            game={currentGame}
            tempCheckpoints={tempCheckpoints}
            onExit={() => navigate(`/admin/${gameId}/checkpoints`)}
          />
        </Box>
      )}

      {/* Success/Error notifikace */}
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
