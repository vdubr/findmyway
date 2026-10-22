import { createTheme } from '@mui/material/styles';

// Svěží a hravé téma podle návrhu redesignu (viz CLAUDE.md → Design).
// Sémantické barvy mají „main“ dost tmavé pro bílý/tmavý text (WCAG AA);
// světlé „light“ odstíny slouží jako pozadí pod tmavým textem z „dark“.

// Barvy pro místa mimo MUI (OpenLayers styly, SVG, meta theme-color)
export const brandColors = {
  forest: '#1E7A4F', // primární zelená
  forestDark: '#0F4D30',
  fox: '#E8692C', // liščí oranžová – akcent, jen s tmavým textem
  sun: '#FFC93C', // sluneční žlutá – checkpointy, hvězdy, odměny
  sky: '#2E86AB', // modrá – poloha hráče
  appBackground: '#F3FBF2',
  hint: '#E4F3E8', // zvýrazněné bloky
  text: '#163A24',
} as const;

const headingFont = '"Baloo 2", "Inter", system-ui, sans-serif';

const theme = createTheme({
  palette: {
    primary: {
      main: brandColors.forest,
      light: '#4FAE7C',
      dark: brandColors.forestDark,
      contrastText: '#fff',
    },
    secondary: {
      main: brandColors.fox,
      light: '#FF9D52',
      dark: '#B94F1C', // čitelný jako text na bílé
      contrastText: '#3A1A0A',
    },
    success: {
      main: '#1A7F4B',
      light: '#E4F7EA',
      dark: '#0F5A34',
      contrastText: '#fff',
    },
    warning: {
      main: brandColors.sun,
      light: '#FFF2D6',
      dark: '#A35A05',
      contrastText: '#3A2A00',
    },
    error: {
      main: '#C43A1F',
      light: '#FDE6E0',
      dark: '#9A2B15',
      contrastText: '#fff',
    },
    info: {
      main: '#1F6A8A', // modrá, aby se nepletla se zelenou
      light: '#E3F2FA',
      dark: '#164E66',
      contrastText: '#fff',
    },
    background: {
      default: 'transparent', // Bez background na body – html zůstává zelená pro Safari toolbar detekci
      paper: '#FFFFFF',
    },
    text: {
      primary: brandColors.text,
      secondary: '#3F6B52',
    },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: headingFont, fontWeight: 800, fontSize: '2.5rem', lineHeight: 1.1 },
    h2: { fontFamily: headingFont, fontWeight: 800, fontSize: '2rem', lineHeight: 1.1 },
    h3: { fontFamily: headingFont, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.15 },
    h4: { fontFamily: headingFont, fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.2 },
    h5: { fontFamily: headingFont, fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2 },
    h6: { fontFamily: headingFont, fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.25 },
    body2: { fontSize: '0.9375rem' }, // ne méně – čitelnost venku na slunci
    button: {
      fontWeight: 700,
      textTransform: 'none',
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 20,
          padding: '10px 24px',
        },
        sizeLarge: {
          padding: '14px 32px',
          fontSize: '1.1rem',
          borderRadius: 22,
        },
        // „Stisknutelné“ tlačítko: tmavší spodní hrana, při stisku se propadne
        contained: ({ theme, ownerState }) => {
          const color = ownerState.color;
          const edge =
            color && color !== 'inherit' && color in theme.palette
              ? theme.palette[color].dark
              : theme.palette.grey[500];
          return {
            boxShadow: `0 4px 0 ${edge}`,
            transition: 'transform 0.08s ease-out, box-shadow 0.08s ease-out',
            '&:hover': { boxShadow: `0 4px 0 ${edge}` },
            '&:active': { transform: 'translateY(2px)', boxShadow: `0 2px 0 ${edge}` },
            '&.Mui-disabled': { boxShadow: 'none' },
          };
        },
        outlined: {
          borderWidth: 2,
          '&:hover': { borderWidth: 2 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 4px 14px rgba(30, 122, 79, 0.14)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
        outlined: {
          borderWidth: 1.5,
        },
      },
    },
    // Vybraná volba přepínače musí být na první pohled poznat (plná zelená)
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 700,
          color: theme.palette.text.primary,
          '&.Mui-selected': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': { backgroundColor: theme.palette.primary.dark },
          },
        }),
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 16px rgba(15, 77, 48, 0.25)',
        },
      },
    },
  },
});

export default theme;
