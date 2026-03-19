import GoogleIcon from '@mui/icons-material/Google';
import { Map as MapIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FoxGuide from '../../../components/FoxGuide';
import { useAuth } from '../AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Pokud je uživatel už přihlášen, přesměruj ho
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
      setError('Přihlášení se nezdařilo. Zkuste to prosím znovu.');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Vyplňte prosím email a heslo');
      return;
    }

    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isSignUp) {
        await signUpWithEmail(email, password);
        // Po registraci zobrazíme úspěšnou zprávu
        alert('Registrace proběhla úspěšně! Nyní se můžete přihlásit.');
        setIsSignUp(false);
        setPassword('');
      } else {
        await signInWithEmail(email, password);
      }

      // Po úspěšném přihlášení se automaticky přesměruje pomocí useEffect
    } catch (err: unknown) {
      console.error('Auth error:', err);

      // Lepší error messages
      let errorMessage = 'Autentizace se nezdařila. Zkuste to prosím znovu.';

      const message = err instanceof Error ? err.message : '';
      if (message.includes('Invalid login credentials')) {
        errorMessage = 'Neplatné přihlašovací údaje. Zkontrolujte email a heslo.';
      } else if (message.includes('Email not confirmed')) {
        errorMessage = 'Email nebyl potvrzen. Zkontrolujte svou emailovou schránku.';
      } else if (message.includes('User already registered')) {
        errorMessage = 'Tento email je již zaregistrován. Zkuste se přihlásit.';
      } else if (message.includes('rate limit')) {
        errorMessage =
          'Rate limit překročen. Počkejte chvíli nebo vypněte "Confirm email" v Supabase nastavení.';
      } else if (message) {
        errorMessage = message;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          py: 4,
        }}
      >
        {/* Logo aplikace + liška */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 100, height: 100 }}>
            <FoxGuide inline state="sitting" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h5" color="primary" fontWeight={700}>
              FindMyWay
            </Typography>
          </Box>
        </Box>

        <Typography variant="h5" fontWeight={600}>
          {isSignUp ? 'Vytvořit účet' : 'Přihlášení'}
        </Typography>

        <Typography variant="body1" color="text.secondary" textAlign="center">
          {isSignUp ? 'Vytvořte si účet pro pokračování' : 'Přihlaste se pro pokračování'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        )}

        {/* Email/Password formulář */}
        <Box
          component="form"
          onSubmit={handleEmailAuth}
          sx={{ width: '100%' }}
          name={isSignUp ? 'signup' : 'login'}
          method="post"
          action="#"
        >
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              name="email"
              id="email"
              autoComplete="username email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              fullWidth
              required
              inputProps={{
                autoCapitalize: 'none',
                autoCorrect: 'off',
              }}
            />
            <TextField
              label="Heslo"
              type="password"
              name="password"
              id="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              fullWidth
              required
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              fullWidth
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : isSignUp ? (
                'Registrovat'
              ) : (
                'Přihlásit se'
              )}
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              disabled={loading}
            >
              {isSignUp ? 'Již máte účet? Přihlaste se' : 'Nemáte účet? Zaregistrujte se'}
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ width: '100%' }}>nebo</Divider>

        {/* Google OAuth */}
        <Button
          variant="outlined"
          color="primary"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
          onClick={handleGoogleLogin}
          disabled={loading}
          sx={{ minWidth: 250 }}
        >
          {loading ? 'Přihlašování...' : 'Přihlásit se přes Google'}
        </Button>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          Vytvořením účtu souhlasíte s našimi podmínkami použití
        </Typography>
      </Box>
    </Container>
  );
}
