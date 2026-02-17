import { createTheme } from '@mui/material/styles';

// Hravé, dětsky přívětivé barvy pro GeoQuest
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B35', // Živá oranžová - pro hlavní akce
      light: '#FF8A5B',
      dark: '#E55A2B',
      contrastText: '#fff',
    },
    secondary: {
      main: '#4ECDC4', // Tyrkysová - pro doplňkové prvky
      light: '#7DDDD5',
      dark: '#3BB5AC',
      contrastText: '#fff',
    },
    success: {
      main: '#95E1D3', // Světle zelená - pro úspěch
      dark: '#6BC9B8',
      contrastText: '#1A535C',
    },
    warning: {
      main: '#FFE66D', // Veselá žlutá
      dark: '#F5D942',
      contrastText: '#1A535C',
    },
    error: {
      main: '#F38181', // Jemná červená
      dark: '#E86464',
      contrastText: '#fff',
    },
    info: {
      main: '#A8DADC', // Světle modrá
      dark: '#7CC5C9',
      contrastText: '#1A535C',
    },
    background: {
      default: '#F7F9FC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A535C', // Tmavě modrozelená pro text
      secondary: '#457B9D',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.01em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // Vypnout uppercase pro přirozenější vzhled
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 12, // Zaoblené rohy pro hravý vzhled
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '1rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        sizeLarge: {
          padding: '14px 32px',
          fontSize: '1.1rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        },
      },
    },
  },
});

export default theme;
