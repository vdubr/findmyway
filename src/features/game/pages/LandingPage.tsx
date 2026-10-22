import { LocationOn as LocationIcon } from '@mui/icons-material';
import { Box, Button, Container, Link, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import foxWaving from '../../../assets/fox/liska_mava.webp';
import ScrollPathSection from '../components/ScrollPathSection';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero sekce – hlavní akce hned nahoře, ne až po dlouhém scrollu */}
      <Container maxWidth="sm" sx={{ pt: 4, pb: 6, textAlign: 'center' }}>
        <Box
          component="img"
          src={foxWaving}
          alt="Liška mává na pozdrav"
          sx={{ width: 150, height: 150, objectFit: 'contain', mb: 1 }}
        />
        <Typography variant="h2" component="h1" gutterBottom>
          Vyraz s liškou do terénu
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 340, mx: 'auto', mb: 3 }}
        >
          Najdi stezku poblíž, dojdi ke všem bodům, vyřeš úkoly – na konci čeká poklad.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<LocationIcon />}
          onClick={() => navigate('/games')}
          sx={{ width: '100%', maxWidth: 320 }}
        >
          Najít hru poblíž
        </Button>
        <Box sx={{ mt: 2 }}>
          <Link component={RouterLink} to="/games/new/edit/base" fontWeight={700}>
            Chci vytvořit vlastní hru
          </Link>
        </Box>
      </Container>

      {/* Scroll animace — serpentinova stezka */}
      <ScrollPathSection />

      {/* CTA sekce */}
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Button variant="contained" size="large" onClick={() => navigate('/games')}>
          Prozkoumat hry
        </Button>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 4 }}>
          Verze {__BUILD_TIME__}
        </Typography>
      </Container>
    </Box>
  );
}
