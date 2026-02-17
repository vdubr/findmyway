import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import { AuthProvider } from './features/auth/AuthContext';
import AuthPage from './features/auth/pages/AuthPage';

// Pages
import HomePage from './features/game/pages/HomePage';
import AdminPage from './features/admin/pages/AdminPage';
import PlayerPage from './features/player/pages/PlayerPage';

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

                {/* Chráněné stránky */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/play/:gameId"
                  element={
                    <ProtectedRoute>
                      <PlayerPage />
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
