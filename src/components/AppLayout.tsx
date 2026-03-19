import {
  ChevronRight as ChevronRightIcon,
  Create as CreateIcon,
  Home as HomeIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Map as MapIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import FoxGuide from './FoxGuide';
import OfflineIndicator from './OfflineIndicator';
import PWAInstallPrompt from './PWAInstallPrompt';
import PWAUpdatePrompt from './PWAUpdatePrompt';

interface AppLayoutProps {
  children: ReactNode;
}

// Názvy stránek pro drobečkovou navigaci
const PAGE_LABELS: Record<string, string> = {
  '/admin': 'Správa her',
  '/profile': 'Můj profil',
  '/auth': 'Přihlášení',
};

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, profile, signOut } = useAuth();

  // Uživatelský dropdown (pravá část)
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);

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
  // Iniciála pro Avatar
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Je uživatel na hlavní stránce (výběr her)?
  const isHome = location.pathname === '/';

  // Název aktuální stránky pro drobečkovou navigaci
  const getBreadcrumbLabel = (): string | null => {
    if (isHome) return null;
    const path = location.pathname;
    if (PAGE_LABELS[path]) return PAGE_LABELS[path];
    if (path.startsWith('/admin')) return 'Správa her';
    if (path.startsWith('/play/')) return 'Hra';
    return null;
  };

  const breadcrumbLabel = getBreadcrumbLabel();

  // Bottom navigation value based on current route
  const getBottomNavValue = () => {
    if (location.pathname === '/') return 0;
    if (location.pathname.startsWith('/admin')) return 1;
    if (location.pathname.startsWith('/play')) return 2;
    return 0;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Header */}
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ position: 'relative' }}>
          {/* Ikona her – aktivní na /, jinak jen ikona s drobečkovou navigací */}
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

          {/* Drobečková navigace – zobrazí se jen mimo hlavní stránku */}
          {breadcrumbLabel && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
              <ChevronRightIcon sx={{ fontSize: 20, opacity: 0.6 }} />
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, ml: 0.5, fontSize: '1rem' }}
              >
                {breadcrumbLabel}
              </Typography>
            </Box>
          )}

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Liska pruvodce uprostred hlavicky */}
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
                  onClick={() => handleNavigate('/admin')}
                  selected={location.pathname.startsWith('/admin')}
                >
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText>Správa her</ListItemText>
                </MenuItem>

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
          pb: isMobile && user ? 7 : 0, // Padding pro bottom navigation
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>

      {/* Bottom Navigation (jen na mobile a kdyz je user prihlasen) */}
      {isMobile && user && (
        <BottomNavigation
          value={getBottomNavValue()}
          onChange={(_event, newValue) => {
            switch (newValue) {
              case 0:
                navigate('/');
                break;
              case 1:
                navigate('/admin');
                break;
              case 2:
                // Navigate to active game or game list
                navigate('/');
                break;
            }
          }}
          showLabels
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: 1,
            borderColor: 'divider',
            zIndex: 1000,
          }}
        >
          <BottomNavigationAction label="Domu" icon={<HomeIcon />} />
          <BottomNavigationAction label="Vytvorit" icon={<CreateIcon />} />
          <BottomNavigationAction label="Hrat" icon={<MapIcon />} />
        </BottomNavigation>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* PWA Update Prompt */}
      <PWAUpdatePrompt />
    </Box>
  );
}
