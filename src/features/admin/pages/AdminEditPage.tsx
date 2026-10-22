// Editace existujici hry - wrapper s URL routovanim
// Nacte hru podle gameId z URL a zobrazuje taby (base/checkpoints/demo)

import { Check as CheckIcon, Edit as EditIcon, People as PeopleIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import ErrorDisplay from '../../../components/ErrorDisplay';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { deleteGame, updateGame } from '../../../lib/api';
import { toUserMessage } from '../../../lib/errors';
import type { CreateGameInput } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
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

// Krok tvorby hry v tabu: číslo v kolečku, po dokončení fajfka
function StepLabel({ n, label, done }: { n: number; label: string; done: boolean }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="span"
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '0.9rem',
          bgcolor: done ? 'primary.main' : 'transparent',
          color: done ? 'primary.contrastText' : 'inherit',
          border: done ? 0 : 2,
          borderColor: 'currentColor',
          boxSizing: 'border-box',
          '.Mui-selected &': done
            ? {}
            : {
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                borderColor: 'transparent',
              },
        }}
      >
        {done ? <CheckIcon sx={{ fontSize: 18 }} /> : n}
      </Box>
      {label}
    </Box>
  );
}

const stepTabsSx = {
  '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 56 },
  '& .MuiTabs-indicator': { bgcolor: 'secondary.main', height: 3, borderRadius: 3 },
} as const;

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

  const { user } = useAuth();

  // Nacist hru z API pri mountu (jen pro existujici hry); nova hra = reset storu.
  // Při odchodu z editoru store vyčistit – jinak by se po návratu ukázal starý
  // neuložený stav místo aktuálních dat z DB.
  useEffect(() => {
    if (isNewGame) {
      reset();
    } else if (gameId) {
      loadGame(gameId);
    }
    return () => reset();
  }, [gameId, isNewGame, loadGame, reset]);

  // Nová hra bez vyplněného základního info (např. reload na /games/new/edit/checkpoints)
  // by nešla uložit – vrátit na první krok
  useEffect(() => {
    if (isNewGame && currentTab !== 'base' && !currentGame) {
      navigate('/games/new/edit/base', { replace: true });
    }
  }, [isNewGame, currentTab, currentGame, navigate]);

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
    if (!currentGame?.id) {
      setDeleteDialogOpen(false);
      return;
    }
    try {
      await deleteGame(currentGame.id);
      reset();
      navigate('/games');
    } catch (err) {
      setActionError(toUserMessage(err, 'Chyba při mazání hry'));
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
      setActionError(toUserMessage(err, 'Chyba při změně stavu hry'));
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

  // Editovat smí jen tvůrce hry (zápis by stejně zablokovalo RLS, ale editor by
  // ukázal cizí hru včetně řešení a mazání by vypadalo jako úspěšné)
  if (!isNewGame && currentGame && user && currentGame.creator_id !== user.id) {
    return <Navigate to={`/games/${gameId}`} replace />;
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
        // Pro checkpoints tab na desktopu (mapa a seznam vedle sebe) zabrat celou dostupnou
        // výšku a nescrollovat. Na mobilu jsou pod sebou – stránka musí scrollovat, jinak by
        // spodek seznamu a tlačítko Uložit hru nebyly dosažitelné.
        ...(currentTab === 'checkpoints' && {
          height: { md: 'calc(100dvh - 64px - env(safe-area-inset-top))' },
          minHeight: { md: 0 },
          overflow: { md: 'hidden' },
        }),
      }}
    >
      {/* Action bar – tvůrčí režim a akce existující hry */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
          flexShrink: 0,
        }}
      >
        <Chip
          icon={<EditIcon />}
          label="Tvůrčí režim"
          size="small"
          sx={{ bgcolor: '#FFE3D3', color: '#8A3A12', '& .MuiChip-icon': { color: '#8A3A12' } }}
        />
        <Box sx={{ flex: 1 }} />
        {!isNewGame && currentGame && (
          <>
            {currentGame.settings?.share_location_required && (
              <Button
                size="small"
                startIcon={<PeopleIcon />}
                onClick={() => setShowLivePlayers(true)}
              >
                Živí hráči
              </Button>
            )}
          </>
        )}
      </Box>

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
          <Tabs value={currentTab} onChange={handleTabChange} sx={stepTabsSx} variant="scrollable">
            <Tab
              label={<StepLabel n={1} label="Základní info" done={currentTab === 'checkpoints'} />}
              value="base"
              disabled={currentTab === 'checkpoints'}
            />
            <Tab
              label={<StepLabel n={2} label="Body na stezce" done={false} />}
              value="checkpoints"
              disabled={currentTab === 'base'}
            />
          </Tabs>
        ) : (
          // Existujici hra - volne prepinatelne taby
          <Tabs value={currentTab} onChange={handleTabChange} sx={stepTabsSx} variant="scrollable">
            <Tab label={<StepLabel n={1} label="Základní info" done />} value="base" />
            <Tab
              label={<StepLabel n={2} label="Body na stezce" done={tempCheckpoints.length > 0} />}
              value="checkpoints"
            />
            <Tab
              label={<StepLabel n={3} label="Vyzkoušet" done={false} />}
              value="demo"
              disabled={tempCheckpoints.length === 0}
            />
          </Tabs>
        )}
      </Box>

      {/* Obsah tabu */}
      {currentTab === 'base' && (
        <Box sx={{ py: 3 }}>
          {isNewGame && !currentGame ? (
            <GameCreatorForm onSubmit={handleFormSubmit} isLoading={isSaving} />
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
                  // Změny průběžně do storu – jinak by se po přepnutí na mapu a uložení ztratily
                  onChange={isNewGame ? undefined : updateCurrentGame}
                  isLoading={isSaving}
                  isEditMode={!isNewGame}
                  isPublished={currentGame.status === 'published'}
                  isPublishing={isPublishing}
                  onTogglePublish={handleTogglePublish}
                  onDelete={isNewGame ? undefined : () => setDeleteDialogOpen(true)}
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
            Opravdu chcete smazat hru "{currentGame?.title}"? Tato akce je nevratná a smaže i
            všechny checkpointy.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Zrušit</Button>
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
