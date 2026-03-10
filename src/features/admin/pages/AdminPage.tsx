// Admin Panel - seznam her s moznosti vytvoreni a editace
// Editace/vytvareni se resi pres URL routing v AdminEditPage

import { Add as AddIcon } from '@mui/icons-material';
import { Box, Button, Container, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GameList from '../components/GameList';

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="flex-end" mb={4}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/new/base')}
          >
            Nova hra
          </Button>
        </Stack>

        {/* Seznam her */}
        <GameList />
      </Box>
    </Container>
  );
}
