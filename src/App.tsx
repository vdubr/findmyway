import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AdminEditPage from './features/admin/pages/AdminEditPage';
import AdminPage from './features/admin/pages/AdminPage';

// Auth
import { AuthProvider } from './features/auth/AuthContext';
import AuthPage from './features/auth/pages/AuthPage';

// Pages
import HomePage from './features/game/pages/HomePage';
import PlayerPage from './features/player/pages/PlayerPage';
import ProfilePage from './features/profile/pages/ProfilePage';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth page bez layoutu */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Vsechny ostatni stranky s layoutem */}
              <Route
                element={
                  <AppLayout>
                    <Outlet />
                  </AppLayout>
                }
              >
                {/* Verejna stranka */}
                <Route path="/" element={<HomePage />} />

                {/* Verejna stranka - hrat hru muze kdokoli */}
                <Route path="/play/:gameId" element={<PlayerPage />} />

                {/* Admin - seznam her */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin - nova hra nebo editace existujici */}
                <Route
                  path="/admin/:gameId/:tab"
                  element={
                    <ProtectedRoute>
                      <AdminEditPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin - redirect /admin/:gameId na /admin/:gameId/base */}
                <Route path="/admin/:gameId" element={<Navigate to="base" replace />} />

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
