import { createTheme } from '@mui/material/styles';

// Přírodní zelené téma evokující cestu do přírody
const theme = createTheme({
  palette: {
    primary: {
      main: '#2D6A4F', // Lesní zelená - pro hlavní akce
      light: '#40916C',
      dark: '#1B4332',
      contrastText: '#fff',
    },
    secondary: {
      main: '#52B788', // Svěží zelená - pro doplňkové prvky
      light: '#74C69D',
      dark: '#40916C',
      contrastText: '#fff',
    },
    success: {
      main: '#95D5B2', // Světle zelená - pro úspěch
      dark: '#74C69D',
      contrastText: '#1B4332',
    },
    warning: {
      main: '#E9C46A', // Teplá písková žlutá
      dark: '#E76F51',
      contrastText: '#1B4332',
    },
    error: {
      main: '#E76F51', // Teplá cihlová
      dark: '#D64933',
      contrastText: '#fff',
    },
    info: {
      main: '#B7E4C7', // Jemná mátová
      dark: '#95D5B2',
      contrastText: '#1B4332',
    },
    background: {
      default: '#F1FAEE', // Jemně krémová jako ranní mlha v lese
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1B4332', // Tmavě lesní zelená pro text
      secondary: '#2D6A4F',
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
