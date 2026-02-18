import { Box, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

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

  // Pokud není přihlášen, přesměruj na auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Jinak zobraz obsah
  return <>{children}</>;
}
