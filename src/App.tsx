import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import AppLayout from './components/AppLayout';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import { AuthProvider } from './features/auth/AuthContext';
import theme from './theme';

// Stránky se načítají až při první návštěvě (code splitting) – OpenLayers a editor
// se tak nestahují na úvodní stránce ani při přihlášení
const LandingPage = lazy(() => import('./features/game/pages/LandingPage'));
const HomePage = lazy(() => import('./features/game/pages/HomePage'));
const GameDetailPage = lazy(() => import('./features/game/pages/GameDetailPage'));
const PlayerPage = lazy(() => import('./features/player/pages/PlayerPage'));
const AdminEditPage = lazy(() => import('./features/admin/pages/AdminEditPage'));
const ProfilePage = lazy(() => import('./features/profile/pages/ProfilePage'));
const AuthPage = lazy(() => import('./features/auth/pages/AuthPage'));

// Pomocné redirect komponenty pro zpětnou kompatibilitu
function RedirectPlay() {
  const { gameId } = useParams<{ gameId: string }>();
  return <Navigate to={`/games/${gameId}/game`} replace />;
}

function RedirectAdmin() {
  const { gameId, tab } = useParams<{ gameId: string; tab: string }>();
  return <Navigate to={`/games/${gameId}/edit/${tab}`} replace />;
}

function RedirectAdminNew() {
  const { tab } = useParams<{ tab: string }>();
  return <Navigate to={`/games/new/edit/${tab}`} replace />;
}

function RedirectAdminBase() {
  const { gameId } = useParams<{ gameId: string }>();
  return <Navigate to={`/games/${gameId}/edit/base`} replace />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Vsechny stranky s layoutem */}
              <Route
                element={
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Outlet />
                    </Suspense>
                  </AppLayout>
                }
              >
                {/* Auth page */}
                <Route path="/auth" element={<AuthPage />} />

                {/* Uvitaci stranka */}
                <Route path="/" element={<LandingPage />} />

                {/* Seznam her */}
                <Route path="/games" element={<HomePage />} />

                {/* Detail hry */}
                <Route path="/games/:gameId" element={<GameDetailPage />} />

                {/* Hrani hry */}
                <Route path="/games/:gameId/game" element={<PlayerPage />} />

                {/* Editace hry */}
                <Route
                  path="/games/:gameId/edit/:tab"
                  element={
                    <ProtectedRoute>
                      <AdminEditPage />
                    </ProtectedRoute>
                  }
                />

                {/* Redirect /games/:gameId/edit -> /games/:gameId/edit/base */}
                <Route path="/games/:gameId/edit" element={<Navigate to="base" replace />} />

                {/* Zpetna kompatibilita – stare URL presmerovat na nove */}
                <Route path="/play/:gameId" element={<RedirectPlay />} />
                <Route path="/admin/new/:tab" element={<RedirectAdminNew />} />
                <Route path="/admin/:gameId/:tab" element={<RedirectAdmin />} />
                <Route path="/admin/:gameId" element={<RedirectAdminBase />} />
                <Route path="/admin" element={<Navigate to="/games" replace />} />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
