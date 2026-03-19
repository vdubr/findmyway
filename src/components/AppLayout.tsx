import {
  KeyboardArrowDown as ArrowDownIcon,
  Create as CreateIcon,
  Home as HomeIcon,
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
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
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

// Konfigurace stranek s jejich nazvy a ikonami
const PAGE_CONFIG: Record<string, { title: string; icon: ReactNode }> = {
  '/': { title: 'Dostupne hry', icon: <HomeIcon /> },
  '/admin': { title: 'Sprava her', icon: <SettingsIcon /> },
  '/profile': { title: 'Muj profil', icon: <PersonIcon /> },
  '/auth': { title: 'Prihlaseni', icon: <LoginIcon /> },
};

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, profile, signOut } = useAuth();

  // Navigační dropdown (levá část)
  const [navAnchorEl, setNavAnchorEl] = useState<null | HTMLElement>(null);
  // Uživatelský dropdown (pravá část)
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);

  const handleNavOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNavAnchorEl(event.currentTarget);
  };
  const handleNavClose = () => setNavAnchorEl(null);

  const handleUserOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserAnchorEl(event.currentTarget);
  };
  const handleUserClose = () => setUserAnchorEl(null);

  const handleNavigate = (path: string) => {
    handleNavClose();
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

  // Ziskat nazev aktualni stranky
  const getCurrentPageTitle = (): string => {
    const path = location.pathname;

    // Presna shoda
    if (PAGE_CONFIG[path]) {
      return PAGE_CONFIG[path].title;
    }

    // Hrani hry - /play/:gameId
    if (path.startsWith('/play/')) {
      return 'Hra';
    }

    // Default
    return 'GeoQuest';
  };

  // Bottom navigation value based on current route
  const getBottomNavValue = () => {
    if (location.pathname === '/') return 0;
    if (location.pathname.startsWith('/admin')) return 1;
    if (location.pathname.startsWith('/play')) return 2;
    return 0;
  };

  const currentPageTitle = getCurrentPageTitle();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Header */}
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ position: 'relative' }}>
          {/* Logo - kliknutelne, naviguje na home */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              mr: 2,
            }}
            onClick={() => navigate('/')}
          >
            <MapIcon sx={{ fontSize: 28 }} />
          </Box>

          {/* Nazev stranky s dropdown - jen navigace */}
          <Button
            color="inherit"
            onClick={handleNavOpen}
            endIcon={<ArrowDownIcon />}
            sx={{
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
              px: 1,
            }}
          >
            {currentPageTitle}
          </Button>

          {/* Navigační dropdown */}
          <Menu
            anchorEl={navAnchorEl}
            open={Boolean(navAnchorEl)}
            onClose={handleNavClose}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            PaperProps={{ sx: { minWidth: 200 } }}
          >
            <MenuItem onClick={() => handleNavigate('/')} selected={location.pathname === '/'}>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText>Dostupné hry</ListItemText>
            </MenuItem>
          </Menu>

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
