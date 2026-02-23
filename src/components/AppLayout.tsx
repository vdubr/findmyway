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
  const { user, signOut } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    handleMenuClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut();
    navigate('/auth');
  };

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

          {/* Nazev stranky s dropdown - kliknutelny */}
          <Button
            color="inherit"
            onClick={handleMenuOpen}
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

          {/* Dropdown menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            PaperProps={{
              sx: { minWidth: 200 },
            }}
          >
            {/* Navigace */}
            <MenuItem onClick={() => handleNavigate('/')} selected={location.pathname === '/'}>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText>Dostupne hry</ListItemText>
            </MenuItem>

            {user && (
              <>
                <MenuItem
                  onClick={() => handleNavigate('/admin')}
                  selected={location.pathname.startsWith('/admin')}
                >
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText>Sprava her</ListItemText>
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate('/profile')}
                  selected={location.pathname === '/profile'}
                >
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText>Muj profil</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleSignOut}>
                  <ListItemIcon>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText>Odhlasit se</ListItemText>
                </MenuItem>
              </>
            )}

            {!user && (
              <MenuItem onClick={() => handleNavigate('/auth')}>
                <ListItemIcon>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText>Prihlasit se</ListItemText>
              </MenuItem>
            )}
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
    </Box>
  );
}
