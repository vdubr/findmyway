import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ScrollPathSection from '../components/ScrollPathSection';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero sekce */}
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary">
          FindMyWay
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Pomoz lisce projit trasu a najit poklad.
        </Typography>
      </Container>

      {/* Scroll animace — serpentinova stezka */}
      <ScrollPathSection />

      {/* CTA sekce */}
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Button variant="contained" size="large" onClick={() => navigate('/games')}>
          Prozkoumat hry
        </Button>
      </Container>
    </Box>
  );
}
