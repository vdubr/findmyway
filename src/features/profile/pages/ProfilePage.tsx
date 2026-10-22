// Stranka profilu uzivatele s moznosti editace a statistikami

import {
  Edit as EditIcon,
  Explore as ExploreIcon,
  Games as GamesIcon,
  Lock as LockIcon,
  Pets as PawIcon,
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
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { getProfileStats, type ProfileStats, updateProfile } from '../../../lib/api';
import { toUserMessage } from '../../../lib/errors';
import { useAuth } from '../../auth/AuthContext';
import { type BadgeId, computeBadges } from '../badges';

// Barvy a ikony odznaků (odemčené); zamčené jsou čárkovaný obrys se zámkem
const BADGE_LOOK: Record<BadgeId, { icon: ReactNode; bg: string; edge: string; fg: string }> = {
  'first-finish': { icon: <PawIcon />, bg: '#FFC93C', edge: '#C99A10', fg: '#5C3A00' },
  'three-finishes': { icon: <TrophyIcon />, bg: '#5BC88C', edge: '#1E7A4F', fg: '#0F4D30' },
  creator: { icon: <EditIcon />, bg: '#FF9D52', edge: '#B94F1C', fg: '#3A1A0A' },
  explorer: { icon: <ExploreIcon />, bg: '#7CC4E8', edge: '#1F6A8A', fg: '#0E3A4D' },
};

// Dlaždice se statistikou
function StatTile({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  loading,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
  loading: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: 'background.paper',
        borderRadius: '18px',
        py: 1.5,
        px: 0.5,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        boxShadow: '0 2px 10px rgba(30, 122, 79, 0.10)',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      {loading ? (
        <Skeleton width={32} height={36} />
      ) : (
        <Typography variant="h3" component="p" lineHeight={1}>
          {value}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

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
        setStatsError(toUserMessage(err, 'Chyba při načítání statistik'));
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [user?.id]);

  // Aktualizovat lokalni state kdyz se zmeni hodnoty profilu. Ne při každé nové instanci
  // profilu (Supabase při návratu do záložky znovu hlásí SIGNED_IN a profil se načte znovu)
  // a ne během editace – přepsalo by to rozepsané změny.
  useEffect(() => {
    if (isEditing) return;
    setUsername(profile?.username || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile?.username, profile?.avatar_url, isEditing]);

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
      setSaveError(toUserMessage(err, 'Chyba při ukládání profilu'));
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

  const badges = useMemo(() => (stats ? computeBadges(stats) : []), [stats]);

  if (!user || !profile) {
    return null;
  }

  const displayName = username || user.email || 'Hráč';

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Hlavička: avatar a jméno */}
        <Stack alignItems="center" spacing={1} sx={{ textAlign: 'center' }}>
          <Avatar
            src={avatarUrl || undefined}
            alt={displayName}
            sx={{
              width: 104,
              height: 104,
              fontSize: 44,
              fontWeight: 800,
              bgcolor: '#FFE3D3',
              color: '#8A3A12',
              border: '4px solid #fff',
              boxShadow: '0 4px 14px rgba(30, 122, 79, 0.18)',
            }}
          >
            {displayName[0].toUpperCase()}
          </Avatar>
          <Typography variant="h2" component="h1" sx={{ wordBreak: 'break-word' }}>
            {displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email} · e-mail nelze změnit
          </Typography>
        </Stack>

        {/* Statistiky */}
        {statsError && <Alert severity="error">{statsError}</Alert>}
        <Stack direction="row" spacing={1}>
          <StatTile
            icon={<GamesIcon />}
            iconBg="#FFE3D3"
            iconColor="#8A3A12"
            value={stats?.gamesCreated ?? 0}
            label="vytvořené"
            loading={statsLoading}
          />
          <StatTile
            icon={<PlayIcon />}
            iconBg="#E3F2FA"
            iconColor="#164E66"
            value={stats?.gamesPlayed ?? 0}
            label="odehrané"
            loading={statsLoading}
          />
          <StatTile
            icon={<TrophyIcon />}
            iconBg="#FFF4D1"
            iconColor="#8A6400"
            value={stats?.gamesCompleted ?? 0}
            label="dohrané"
            loading={statsLoading}
          />
        </Stack>

        {/* Odznaky */}
        {stats && (
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
                Odznaky
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 1,
                  textAlign: 'center',
                }}
              >
                {badges.map((badge) => {
                  const look = BADGE_LOOK[badge.id];
                  return (
                    <Box
                      key={badge.id}
                      title={badge.unlocked ? badge.label : `${badge.goal} (${badge.progress})`}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          ...(badge.unlocked
                            ? {
                                bgcolor: look.bg,
                                color: look.fg,
                                boxShadow: `0 3px 0 ${look.edge}`,
                              }
                            : { border: '2px dashed #9CC3AA', color: '#5C8A70' }),
                          '& svg': { fontSize: badge.unlocked ? 28 : 22 },
                        }}
                      >
                        {badge.unlocked ? look.icon : <LockIcon />}
                      </Box>
                      <Typography variant="caption" fontWeight={700} lineHeight={1.2}>
                        {badge.label}
                      </Typography>
                      {!badge.unlocked && (
                        <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
                          {badge.progress}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Úprava účtu */}
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant="h5" component="h2">
                Účet
              </Typography>

              {saveError && (
                <Alert severity="error" onClose={() => setSaveError(null)}>
                  {saveError}
                </Alert>
              )}
              {saveSuccess && <Alert severity="success">Profil byl úspěšně uložen</Alert>}

              <TextField
                label="Uživatelské jméno"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!isEditing || isSaving}
                fullWidth
                autoComplete="username"
              />

              {isEditing && (
                <TextField
                  label="URL avataru"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  disabled={isSaving}
                  fullWidth
                  helperText="Odkaz na obrázek (nepovinné)"
                  autoComplete="photo"
                />
              )}

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                {isEditing ? (
                  <>
                    <Button variant="outlined" onClick={handleCancel} disabled={isSaving}>
                      Zrušit
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Ukládám…' : 'Uložit'}
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
      </Stack>
    </Container>
  );
}
