// Integrační test editoru: tlačítko Uložit hru musí zavolat uložení do DB
// a při chybě nesmí rozpracovanou hru zahodit
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../../lib/api';
import type { Game } from '../../../types';
import { useGameEditorStore } from '../store/gameEditorStore';
import AdminEditPage from './AdminEditPage';

vi.mock('../../../lib/api', () => ({
  createGame: vi.fn(),
  deleteGame: vi.fn(),
  updateGame: vi.fn(),
  saveGameCheckpoints: vi.fn(),
  getGameById: vi.fn(),
  getCheckpointsWithSecrets: vi.fn(),
  uploadCheckpointImage: vi.fn(),
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

// OpenLayers v jsdom nefunguje – mapa je tlačítko, které „klikne“ do mapy
vi.mock('../../map/components/MapComponent', () => ({
  default: ({
    onMapClick,
  }: {
    onMapClick?: (loc: { latitude: number; longitude: number }) => void;
  }) => (
    <button type="button" onClick={() => onMapClick?.({ latitude: 50.1, longitude: 14.2 })}>
      mapa
    </button>
  ),
}));
vi.mock('../../map/components/MiniMapPicker', () => ({ default: () => null }));
vi.mock('../components/DemoPlayer', () => ({ default: () => null }));
vi.mock('../components/LivePlayersMap', () => ({ default: () => null }));

const mocked = vi.mocked(api);

const savedGame: Game = {
  id: 'game-1',
  creator_id: 'user-1',
  title: 'Testovací hra',
  description: null,
  is_public: true,
  difficulty: 3,
  tags: [],
  settings: {
    radius_tolerance: 10,
    allow_skip: false,
    max_players: null,
    time_limit: null,
    share_location_required: false,
    show_radius: true,
  },
  status: 'draft',
  created_at: '2026-10-23T00:00:00Z',
  updated_at: '2026-10-23T00:00:00Z',
};

function LocationProbe() {
  const location = useLocation();
  const message = (location.state as { successMessage?: string } | null)?.successMessage;
  return (
    <>
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      <div data-testid="message">{message ?? ''}</div>
    </>
  );
}

function renderEditor(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/games/:gameId/edit/:tab" element={<AdminEditPage />} />
        <Route path="/games/:gameId" element={<div>detail hry</div>} />
        <Route path="/games" element={<div>přehled her</div>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
}

// Nová hra: základní info → mapa → jeden checkpoint (zavřít jeho editor)
async function fillNewGameWithCheckpoint() {
  fireEvent.change(screen.getByLabelText(/Název hry/), { target: { value: 'Testovací hra' } });
  fireEvent.click(screen.getByRole('button', { name: /Pokračovat na mapu/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'mapa' }));
  useGameEditorStore.getState().selectCheckpoint(null);
}

describe('AdminEditPage – uložení hry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameEditorStore.getState().reset();
    mocked.getGameById.mockResolvedValue({ ...savedGame } as never);
    mocked.getCheckpointsWithSecrets.mockResolvedValue([]);
  });

  it('nová hra: Uložit hru vytvoří hru a uloží checkpointy', async () => {
    mocked.createGame.mockResolvedValue({ ...savedGame } as never);
    mocked.saveGameCheckpoints.mockResolvedValue([]);
    renderEditor('/games/new/edit/base');

    await fillNewGameWithCheckpoint();
    fireEvent.click(await screen.findByRole('button', { name: /Uložit hru/ }));

    await waitFor(() => expect(mocked.saveGameCheckpoints).toHaveBeenCalledTimes(1));
    expect(mocked.createGame).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Testovací hra' })
    );
    expect(mocked.saveGameCheckpoints).toHaveBeenCalledWith('game-1', [
      expect.objectContaining({ order_index: 0, latitude: 50.1, longitude: 14.2 }),
    ]);
    // Uživatel skončí v přehledu na konceptech (ne na prázdném formuláři nové hry)
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/games\?draft=true$/)
    );
    expect(screen.getByTestId('message')).toHaveTextContent('byla úspěšně vytvořena');
  });

  it('nová hra: chyba při ukládání checkpointů smaže prázdnou hru, ale editor o body nepřijde', async () => {
    mocked.createGame.mockResolvedValue({ ...savedGame } as never);
    mocked.saveGameCheckpoints.mockRejectedValue({ code: 'PGRST204', message: 'column x' });
    mocked.deleteGame.mockResolvedValue(undefined as never);
    renderEditor('/games/new/edit/base');

    await fillNewGameWithCheckpoint();
    fireEvent.click(await screen.findByRole('button', { name: /Uložit hru/ }));

    expect(await screen.findByText(/Obnovte prosím stránku/)).toBeInTheDocument();
    expect(mocked.deleteGame).toHaveBeenCalledWith('game-1');
    expect(screen.getByTestId('location')).toHaveTextContent('/games/new/edit/checkpoints');
    expect(useGameEditorStore.getState().tempCheckpoints).toHaveLength(1);
    expect(useGameEditorStore.getState().currentGame?.title).toBe('Testovací hra');
  });

  it('existující koncept: Uložit hru uloží údaje i checkpointy a vrátí do konceptů', async () => {
    mocked.updateGame.mockResolvedValue({ ...savedGame } as never);
    mocked.saveGameCheckpoints.mockResolvedValue([]);
    renderEditor('/games/game-1/edit/checkpoints');

    fireEvent.click(await screen.findByRole('button', { name: 'mapa' }));
    useGameEditorStore.getState().selectCheckpoint(null);
    fireEvent.click(await screen.findByRole('button', { name: /Uložit hru/ }));

    await waitFor(() => expect(mocked.saveGameCheckpoints).toHaveBeenCalledTimes(1));
    expect(mocked.updateGame).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({ title: 'Testovací hra' })
    );
    expect(mocked.saveGameCheckpoints).toHaveBeenCalledWith('game-1', [
      expect.objectContaining({ latitude: 50.1, longitude: 14.2 }),
    ]);
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/games\?draft=true$/)
    );
    expect(screen.getByTestId('message')).toHaveTextContent('byla úspěšně aktualizována');
  });

  it('publikovaná hra: po uložení přehled bez filtru konceptů', async () => {
    mocked.getGameById.mockResolvedValue({ ...savedGame, status: 'published' } as never);
    mocked.updateGame.mockResolvedValue({ ...savedGame } as never);
    mocked.saveGameCheckpoints.mockResolvedValue([]);
    renderEditor('/games/game-1/edit/checkpoints');

    fireEvent.click(await screen.findByRole('button', { name: 'mapa' }));
    useGameEditorStore.getState().selectCheckpoint(null);
    fireEvent.click(await screen.findByRole('button', { name: /Uložit hru/ }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/games$/));
    expect(mocked.saveGameCheckpoints).toHaveBeenCalledTimes(1);
  });
});
