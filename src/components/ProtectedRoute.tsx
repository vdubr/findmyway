import { Box, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Zobrazit loading spinner při načítání auth stavu
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Pokud není přihlášen, přesměruj na auth – s původní adresou, kam se po přihlášení vrátit
  if (!user) {
    return (
      <Navigate to="/auth" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  // Jinak zobraz obsah
  return <>{children}</>;
}
