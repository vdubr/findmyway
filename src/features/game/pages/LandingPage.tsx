// Uvítací stránka aplikace – obsah doplníme později
import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary">
        FindMyWay
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
        GPS treasure hunt - objevuj checkpointy v realnem svete
      </Typography>
      <Box>
        <Button variant="contained" size="large" onClick={() => navigate('/games')}>
          Prozkoumat hry
        </Button>
      </Box>
    </Container>
  );
}
