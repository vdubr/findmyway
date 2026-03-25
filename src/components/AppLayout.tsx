import {
  KeyboardArrowDown as ArrowDownIcon,
  ChevronRight as ChevronRightIcon,
  InfoOutlined as InfoIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Map as MapIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameEditorStore } from '../features/admin/store/gameEditorStore';
import { useAuth } from '../features/auth/AuthContext';
import { useGamePlayStore } from '../features/player/store/gamePlayStore';
import FoxGuide from './FoxGuide';
import OfflineIndicator from './OfflineIndicator';
import PWAInstallPrompt from './PWAInstallPrompt';
import PWAUpdatePrompt from './PWAUpdatePrompt';

interface AppLayoutProps {
  children: ReactNode;
}

// Labely záložek adminu
const TAB_LABELS: Record<string, string> = {
  base: 'Základní info',
  checkpoints: 'Checkpointy',
  demo: 'Demo',
};

// Breadcrumb položka
interface Crumb {
  label: string;
  path?: string; // klikatelná → naviguje; undefined = aktuální (neklikatelná)
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, profile, signOut } = useAuth();

  // Názvy her ze storů
  const editorGame = useGameEditorStore((s) => s.currentGame);
  const playGame = useGamePlayStore((s) => s.game);

  // Uživatelský dropdown (pravá část)
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);

  // Popover s verzí aplikace
  const [versionAnchorEl, setVersionAnchorEl] = useState<null | HTMLElement>(null);

  const handleUserOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserAnchorEl(event.currentTarget);
  };
  const handleUserClose = () => setUserAnchorEl(null);

  const handleNavigate = (path: string) => {
    handleUserClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    handleUserClose();
    await signOut();
    navigate('/auth');
  };

  // Zobrazované jméno uživatele
  const displayName = profile?.username ?? user?.email ?? 'Uživatel';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Je uživatel na hlavní stránce?
  const isHome = location.pathname === '/';

  // Sestavení drobečkové navigace
  const buildBreadcrumbs = (): Crumb[] => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [];

    // /admin
    if (parts[0] === 'admin') {
      // /admin/:gameId/:tab
      const gameId = parts[1];
      const tab = parts[2];
      const gameTitle = editorGame?.title ?? (gameId === 'new' ? 'Nová hra' : '…');
      const crumbs: Crumb[] = [
        { label: gameTitle, path: gameId !== 'new' ? `/admin/${gameId}/base` : undefined },
      ];
      if (tab && TAB_LABELS[tab]) {
        crumbs.push({ label: TAB_LABELS[tab] });
      }
      return crumbs;
    }

    // /play/:gameId
    if (parts[0] === 'play' && parts[1]) {
      const gameTitle = playGame?.title ?? '…';
      return [{ label: gameTitle }];
    }

    // /profile
    if (parts[0] === 'profile') return [{ label: 'Můj profil' }];

    // /auth
    if (parts[0] === 'auth') return [{ label: 'Přihlášení' }];

    return [];
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
      }}
    >
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Header */}
      <AppBar position="fixed" elevation={2} sx={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Toolbar sx={{ position: 'relative' }}>
          {/* Ikona her – aktivní na / */}
          <Tooltip title="Výběr her">
            <IconButton
              color="inherit"
              onClick={() => navigate('/')}
              sx={{
                borderRadius: 2,
                px: 1.5,
                bgcolor: isHome ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <MapIcon sx={{ fontSize: 26 }} />
            </IconButton>
          </Tooltip>

          {/* Víceúrovňová drobečková navigace */}
          {breadcrumbs.map((crumb, i) => (
            <Box key={crumb.label} sx={{ display: 'flex', alignItems: 'center' }}>
              <ChevronRightIcon sx={{ fontSize: 18, opacity: 0.55, mx: 0.25 }} />
              {crumb.path ? (
                <Button
                  color="inherit"
                  onClick={() => navigate(crumb.path!)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                    fontSize: '0.95rem',
                    px: 0.75,
                    minWidth: 0,
                    opacity: 0.85,
                    '&:hover': { opacity: 1 },
                  }}
                >
                  {crumb.label}
                </Button>
              ) : (
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    px: 0.75,
                    maxWidth: isMobile ? 120 : 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {crumb.label}
                </Typography>
              )}
            </Box>
          ))}

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Liška průvodce uprostřed */}
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              height: 64,
              width: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <FoxGuide inline />
          </Box>

          {/* Uživatelská sekce - pravá část */}
          {user ? (
            <>
              <Button
                color="inherit"
                onClick={handleUserOpen}
                endIcon={<ArrowDownIcon />}
                startIcon={
                  <Avatar
                    src={profile?.avatar_url ?? undefined}
                    sx={{ width: 28, height: 28, fontSize: '0.85rem' }}
                  >
                    {avatarLetter}
                  </Avatar>
                }
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 1,
                  gap: 0.5,
                }}
              >
                {!isMobile && (
                  <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                    {displayName}
                  </Typography>
                )}
              </Button>

              {/* Uživatelský dropdown */}
              <Menu
                anchorEl={userAnchorEl}
                open={Boolean(userAnchorEl)}
                onClose={handleUserClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{ sx: { minWidth: 200 } }}
              >
                <MenuItem
                  onClick={() => handleNavigate('/profile')}
                  selected={location.pathname === '/profile'}
                >
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText>Můj profil</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleSignOut}>
                  <ListItemIcon>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText>Odhlásit se</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/auth')}
              variant="outlined"
              size="small"
              sx={{
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { borderColor: 'white' },
                textTransform: 'none',
              }}
            >
              Přihlásit se
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: { xs: '56px', sm: '64px' },
          pb: 'env(safe-area-inset-bottom)',
          bgcolor: '#F1FAEE',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* PWA Update Prompt */}
      <PWAUpdatePrompt />

      {/* Tlačítko verze – vpravo dole */}
      <Tooltip title="Verze aplikace">
        <IconButton
          size="small"
          onClick={(e) => setVersionAnchorEl(e.currentTarget)}
          sx={{
            position: 'fixed',
            bottom: 12,
            right: 12,
            bgcolor: 'background.paper',
            boxShadow: 2,
            width: 32,
            height: 32,
            zIndex: 1200,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <InfoIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(versionAnchorEl)}
        anchorEl={versionAnchorEl}
        onClose={() => setVersionAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Build
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {__BUILD_TIME__}
          </Typography>
        </Box>
      </Popover>
    </Box>
  );
}
