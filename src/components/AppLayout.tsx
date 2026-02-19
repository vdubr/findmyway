import {
  Create as CreateIcon,
  Home as HomeIcon,
  Logout as LogoutIcon,
  Map as MapIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  IconButton,
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

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, profile, signOut } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut();
    navigate('/auth');
  };

  // Bottom navigation value based on current route
  const getBottomNavValue = () => {
    if (location.pathname === '/') return 0;
    if (location.pathname.startsWith('/admin')) return 1;
    if (location.pathname.startsWith('/play')) return 2;
    return 0;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Header */}
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ position: 'relative' }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            sx={{ mr: 2 }}
            onClick={() => navigate('/')}
          >
            <MapIcon />
          </IconButton>

          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 700 }}
            onClick={() => navigate('/')}
          >
            GeoQuest
          </Typography>

          {/* Liška průvodce uprostřed hlavičky */}
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

          {user && (
            <>
              {!isMobile && (
                <Typography variant="body2" sx={{ mr: 2 }}>
                  {profile?.username || user.email}
                </Typography>
              )}
              <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
                <Avatar
                  alt={profile?.username || user.email || 'User'}
                  src={profile?.avatar_url || undefined}
                  sx={{ width: 40, height: 40 }}
                />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate('/profile');
                  }}
                >
                  <PersonIcon sx={{ mr: 1 }} />
                  Můj profil
                </MenuItem>
                <MenuItem onClick={handleSignOut}>
                  <LogoutIcon sx={{ mr: 1 }} />
                  Odhlásit se
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pb: isMobile && user ? 7 : 0, // Padding pro bottom navigation
        }}
      >
        {children}
      </Box>

      {/* Bottom Navigation (jen na mobile a když je user přihlášen) */}
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
          <BottomNavigationAction label="Domů" icon={<HomeIcon />} />
          <BottomNavigationAction label="Vytvořit" icon={<CreateIcon />} />
          <BottomNavigationAction label="Hrát" icon={<MapIcon />} />
        </BottomNavigation>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </Box>
  );
}
