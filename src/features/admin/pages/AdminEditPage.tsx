// Editace existujici hry - wrapper s URL routovanim
// Nacte hru podle gameId z URL a zobrazuje taby (base/checkpoints/demo)

import { People as PeopleIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Tab,
  Tabs,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorDisplay from '../../../components/ErrorDisplay';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { deleteGame, updateGame } from '../../../lib/api';
import type { CreateGameInput } from '../../../types';
import CheckpointEditor from '../components/CheckpointEditor';
import DemoPlayer from '../components/DemoPlayer';
import GameCreatorForm from '../components/GameCreatorForm';
import LivePlayersMap from '../components/LivePlayersMap';
import MapEditor from '../components/MapEditor';
import { useSaveGame } from '../hooks/useSaveGame';
import { useGameEditorStore } from '../store/gameEditorStore';

// Mapovani URL segmentu na tab hodnoty
type TabValue = 'base' | 'checkpoints' | 'demo';

// Validni URL segmenty pro taby
const VALID_TABS: TabValue[] = ['base', 'checkpoints', 'demo'];

export default function AdminEditPage() {
  const { gameId, tab } = useParams<{ gameId: string; tab: string }>();
  const navigate = useNavigate();
  const { isSaving, successMessage, errorMessage, saveNewGame, updateExistingGame, clearMessages } =
    useSaveGame();

  // Stavy pro delete dialog a live players
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showLivePlayers, setShowLivePlayers] = useState(false);

  const {
    currentGame,
    tempCheckpoints,
    selectedCheckpointId,
    isLoading,
    loadError,
    loadGame,
    initNewGame,
    updateCurrentGame,
    setCurrentGame,
    selectCheckpoint,
    reset,
  } = useGameEditorStore();

  // Aktualni tab z URL (default: base)
  const currentTab: TabValue = VALID_TABS.includes(tab as TabValue) ? (tab as TabValue) : 'base';

  // Je to nova hra?
  const isNewGame = gameId === 'new';

  // Nacist hru z API pri mountu (jen pro existujici hry); nova hra = reset storu
  useEffect(() => {
    if (isNewGame) {
      reset();
    } else if (gameId) {
      loadGame(gameId);
    }
  }, [gameId, isNewGame, loadGame, reset]);

  // Redirect na /base pokud je nevalidni tab
  useEffect(() => {
    if (tab && !VALID_TABS.includes(tab as TabValue)) {
      const base = isNewGame ? '/games/new/edit/base' : `/games/${gameId}/edit/base`;
      navigate(base, { replace: true });
    }
  }, [tab, gameId, isNewGame, navigate]);

  // Prepnuti tabu
  const handleTabChange = (_: React.SyntheticEvent, newValue: TabValue) => {
    const path = isNewGame ? `/games/new/edit/${newValue}` : `/games/${gameId}/edit/${newValue}`;
    navigate(path);
  };

  // Zpracovat formular - nova hra
  const handleNewGameFormSubmit = async (gameData: CreateGameInput) => {
    initNewGame(gameData);
    navigate('/games/new/edit/checkpoints');
  };

  // Zpracovat formular - editace existujici hry
  const handleEditFormSubmit = async (gameData: CreateGameInput) => {
    updateCurrentGame(gameData);
    await updateExistingGame();
  };

  // Smazat hru
  const handleDeleteConfirm = async () => {
    if (!currentGame?.id) return;
    try {
      await deleteGame(currentGame.id);
      reset();
      navigate('/games');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Chyba pri mazani hry');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // Prepnout publikaci
  const handleTogglePublish = async () => {
    if (!currentGame?.id) return;
    try {
      setIsPublishing(true);
      const newStatus = currentGame.status === 'published' ? 'draft' : 'published';
      await updateGame(currentGame.id, { status: newStatus });
      setCurrentGame({ ...currentGame, status: newStatus });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Chyba pri zmene stavu hry');
    } finally {
      setIsPublishing(false);
    }
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
  const handleSave = isNewGame ? saveNewGame : updateExistingGame;
  const handleFormSubmit = isNewGame ? handleNewGameFormSubmit : handleEditFormSubmit;

  return (
    <Container
      maxWidth="xl"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // Pro checkpoints tab - zabrat celou dostupnou vysku, nescrollovat
        ...(currentTab === 'checkpoints' && {
          height: {
            xs: 'calc(100dvh - 56px - env(safe-area-inset-top))',
            sm: 'calc(100dvh - 64px - env(safe-area-inset-top))',
          },
          minHeight: 0,
          overflow: 'hidden',
        }),
      }}
    >
      {/* Action bar – jen pro existujici hry */}
      {!isNewGame && currentGame && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            py: 1.5,
            flexShrink: 0,
          }}
        >
          {currentGame.settings?.share_location_required && (
            <Button
              size="small"
              startIcon={<PeopleIcon />}
              onClick={() => setShowLivePlayers(true)}
            >
              Živí hráči
            </Button>
          )}
        </Box>
      )}

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
            <GameCreatorForm onSubmit={handleFormSubmit} />
          ) : (
            currentGame && (
              <>
                <GameCreatorForm
                  initialValues={{
                    title: currentGame.title,
                    description: currentGame.description || '',
                    is_public: currentGame.is_public,
                    difficulty: currentGame.difficulty,
                    tags: currentGame.tags ?? [],
                    settings: currentGame.settings,
                  }}
                  onSubmit={handleFormSubmit}
                  isEditMode={!isNewGame}
                  isPublished={currentGame.status === 'published'}
                  isPublishing={isPublishing}
                  onTogglePublish={handleTogglePublish}
                  onDelete={() => setDeleteDialogOpen(true)}
                />
              </>
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
            onExit={() => navigate(`/games/${gameId}/edit/checkpoints`)}
          />
        </Box>
      )}

      {/* Success/Error notifikace */}
      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={clearMessages}>
        <Alert severity="success" onClose={clearMessages}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar open={!!errorMessage} autoHideDuration={6000} onClose={clearMessages}>
        <Alert severity="error" onClose={clearMessages}>
          {errorMessage}
        </Alert>
      </Snackbar>

      <Snackbar open={!!actionError} autoHideDuration={6000} onClose={() => setActionError(null)}>
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      </Snackbar>

      {/* Dialog potvrzeni smazani */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Smazat hru?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Opravdu chcete smazat hru "{currentGame?.title}"? Tato akce je nevratna a smaze i
            vsechny checkpointy.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Zrusit</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Smazat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Live players mapa */}
      {showLivePlayers && currentGame && (
        <LivePlayersMap
          game={currentGame}
          open={showLivePlayers}
          onClose={() => setShowLivePlayers(false)}
        />
      )}
    </Container>
  );
}
