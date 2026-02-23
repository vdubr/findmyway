// Stranka profilu uzivatele s moznosti editace a statistikami

import {
  Edit as EditIcon,
  Games as GamesIcon,
  SportsEsports as PlayIcon,
  Save as SaveIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getProfileStats, type ProfileStats, updateProfile } from '../../../lib/api';
import { useAuth } from '../../auth/AuthContext';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Nacist statistiky pri mountu
  useEffect(() => {
    if (!user?.id) return;

    const loadStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);
        const data = await getProfileStats(user.id);
        setStats(data);
      } catch (err) {
        setStatsError(err instanceof Error ? err.message : 'Chyba pri nacitani statistik');
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [user?.id]);

  // Aktualizovat lokalni state kdyz se zmeni profile
  useEffect(() => {
    setUsername(profile?.username || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile]);

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      await updateProfile(user.id, {
        username: username || null,
        avatar_url: avatarUrl || null,
      });

      await refreshProfile();
      setIsEditing(false);
      setSaveSuccess(true);

      // Skryt uspech po 3 sekundach
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Chyba pri ukladani profilu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUsername(profile?.username || '');
    setAvatarUrl(profile?.avatar_url || '');
    setIsEditing(false);
    setSaveError(null);
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" color="primary" gutterBottom>
        Muj profil
      </Typography>

      <Grid container spacing={3}>
        {/* Profil karta */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                {/* Avatar */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Avatar
                    src={avatarUrl || undefined}
                    alt={username || user.email || 'User'}
                    sx={{ width: 120, height: 120, fontSize: 48 }}
                  >
                    {(username || user.email || 'U')[0].toUpperCase()}
                  </Avatar>
                </Box>

                {/* Alerts */}
                {saveError && (
                  <Alert severity="error" onClose={() => setSaveError(null)}>
                    {saveError}
                  </Alert>
                )}
                {saveSuccess && <Alert severity="success">Profil byl uspesne ulozen</Alert>}

                {/* Email - readonly */}
                <TextField
                  label="Email"
                  value={user.email || ''}
                  disabled
                  fullWidth
                  helperText="Email nelze zmenit"
                />

                {/* Username */}
                <TextField
                  label="Uzivatelske jmeno"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditing || isSaving}
                  fullWidth
                  autoComplete="username"
                />

                {/* Avatar URL */}
                {isEditing && (
                  <TextField
                    label="URL avataru"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    disabled={isSaving}
                    fullWidth
                    helperText="URL obrazku pro avatar (nepovinne)"
                    autoComplete="photo"
                  />
                )}

                {/* Akce */}
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  {isEditing ? (
                    <>
                      <Button variant="outlined" onClick={handleCancel} disabled={isSaving}>
                        Zrusit
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Ukladam...' : 'Ulozit'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => setIsEditing(true)}
                    >
                      Upravit profil
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistiky karta */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Statistiky
              </Typography>

              {statsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {statsError}
                </Alert>
              )}

              <Stack spacing={2}>
                {/* Vytvorene hry */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                  }}
                >
                  <GamesIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Vytvorene hry
                    </Typography>
                    {statsLoading ? (
                      <Skeleton width={40} height={32} />
                    ) : (
                      <Typography variant="h5" fontWeight="bold">
                        {stats?.gamesCreated || 0}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Odehrane hry */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                  }}
                >
                  <PlayIcon color="secondary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Odehrane hry
                    </Typography>
                    {statsLoading ? (
                      <Skeleton width={40} height={32} />
                    ) : (
                      <Typography variant="h5" fontWeight="bold">
                        {stats?.gamesPlayed || 0}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Dokoncene hry */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                  }}
                >
                  <TrophyIcon sx={{ fontSize: 40, color: '#E9C46A' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Dokoncene hry
                    </Typography>
                    {statsLoading ? (
                      <Skeleton width={40} height={32} />
                    ) : (
                      <Typography variant="h5" fontWeight="bold">
                        {stats?.gamesCompleted || 0}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
