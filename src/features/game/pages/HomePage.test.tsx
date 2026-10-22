// Přehled her: editor po uložení posílá na /games?draft=true s hláškou – filtr konceptů
// se musí zapnout z URL a hláška zobrazit
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../../lib/api';
import type { GameWithCheckpointSummary } from '../../../types';
import HomePage from './HomePage';

vi.mock('../../../lib/api', () => ({
  getPublicGamesWithCheckpoints: vi.fn(),
  getMyDraftGamesWithCheckpoints: vi.fn(),
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ position: null, requestPermission: vi.fn() }),
}));

// OpenLayers v jsdom nefunguje
vi.mock('../components/GamesMapView', () => ({ default: () => null }));

const mocked = vi.mocked(api);

function game(id: string, title: string, status: 'draft' | 'published'): GameWithCheckpointSummary {
  return {
    id,
    creator_id: 'user-1',
    title,
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
    status,
    created_at: '2026-10-23T00:00:00Z',
    updated_at: '2026-10-23T00:00:00Z',
    checkpoints: [],
  } as unknown as GameWithCheckpointSummary;
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderHome(entry: string | { pathname: string; search: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/games" element={<HomePage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('HomePage – filtr konceptů z URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getPublicGamesWithCheckpoints.mockResolvedValue([
      game('pub-1', 'Publikovaná hra', 'published'),
    ]);
    mocked.getMyDraftGamesWithCheckpoints.mockResolvedValue([
      game('draft-1', 'Můj koncept', 'draft'),
    ]);
  });

  it('?draft=true ukáže koncepty a hlášku z editoru', async () => {
    renderHome({
      pathname: '/games',
      search: '?draft=true',
      state: { successMessage: 'Hra "Můj koncept" byla úspěšně vytvořena!' },
    });

    expect(await screen.findByText('Můj koncept')).toBeInTheDocument();
    expect(screen.queryByText('Publikovaná hra')).not.toBeInTheDocument();
    expect(screen.getByText(/byla úspěšně vytvořena/)).toBeInTheDocument();
    // Parametr zůstane v URL (přežije reload), hláška z historie zmizí
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/games\?draft=true$/);
  });

  it('bez parametru ukáže publikované hry, přepnutí filtru zapíše draft=true do URL', async () => {
    renderHome('/games');

    expect(await screen.findByText('Publikovaná hra')).toBeInTheDocument();
    expect(screen.queryByText('Můj koncept')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Draftované \(1\)/));
    expect(await screen.findByText('Můj koncept')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/games\?draft=true$/);

    fireEvent.click(screen.getByText(/Draftované \(1\)/));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/games$/);
  });

  it('koncepty jsou vidět i bez publikovaných her', async () => {
    mocked.getPublicGamesWithCheckpoints.mockResolvedValue([]);
    renderHome('/games?draft=true');

    expect(await screen.findByText('Můj koncept')).toBeInTheDocument();
  });
});
