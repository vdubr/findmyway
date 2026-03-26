import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import AppLayout from './components/AppLayout';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AdminEditPage from './features/admin/pages/AdminEditPage';

// Auth
import { AuthProvider } from './features/auth/AuthContext';
import AuthPage from './features/auth/pages/AuthPage';

// Pages
import GameDetailPage from './features/game/pages/GameDetailPage';
import HomePage from './features/game/pages/HomePage';
import LandingPage from './features/game/pages/LandingPage';
import PlayerPage from './features/player/pages/PlayerPage';
import ProfilePage from './features/profile/pages/ProfilePage';
import theme from './theme';

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
                    <Outlet />
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
