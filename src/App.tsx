import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
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

              {/* Všechny ostatní stránky s layoutem */}
              <Route
                element={
                  <AppLayout>
                    <Outlet />
                  </AppLayout>
                }
              >
                {/* Veřejná stránka */}
                <Route path="/" element={<HomePage />} />

                {/* Veřejná stránka - hrát hru může kdokoli */}
                <Route path="/play/:gameId" element={<PlayerPage />} />

                {/* Chráněné stránky - jen pro přihlášené */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />

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
