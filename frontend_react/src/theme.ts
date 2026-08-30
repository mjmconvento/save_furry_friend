import { createTheme } from '@mui/material/styles';

/**
 * Warm editorial palette. These are the design tokens from the Pencil canvas -
 * every colour in the app should come from here, never from a literal hex in a
 * component. Adding a colour means adding a token.
 *
 * Text-bearing tokens are AA-verified (>= 4.5:1) against page, surface AND
 * sunken: textMuted 4.98:1 on page, accent 5.92:1 as white-on-accent and
 * 4.91:1 as text on accentSoft. The previous values (#948A7E, #C4633F)
 * measured 3.2-4.0:1 and failed on every screen.
 */
const warm = {
  page: '#FAF7F2',
  surface: '#FFFFFF',
  sunken: '#F2EDE5',
  textPrimary: '#211E1B',
  textSecondary: '#5F574E',
  textMuted: '#726A5F',
  accent: '#9F4C2C',
  accentHover: '#8C4226',
  accentSoft: '#F6E7DF',
  border: '#E5DED3',
} as const;

/**
 * One hue per post category. `main` is for text and rules, `soft` for the badge
 * background behind it; every `main` is AA-verified on its `soft` AND on the
 * page (happy 4.9:1 on soft - its old #B07714 measured 3.29:1).
 */
const tone = {
  happy: { main: '#8A5E0F', soft: '#F7EDD8' },
  neutral: { main: '#4E5A64', soft: '#E8EBED' },
  heartbreaking: { main: '#A34A5C', soft: '#F5E3E7' },
} as const;

const displayFont = '"Fraunces", Georgia, "Times New Roman", serif';
const bodyFont =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

type ToneColor = { main: string; soft: string };
type TonePalette = {
  happy: ToneColor;
  neutral: ToneColor;
  heartbreaking: ToneColor;
};

declare module '@mui/material/styles' {
  interface Palette {
    tone: TonePalette;
    surface: { sunken: string };
  }
  interface PaletteOptions {
    tone: TonePalette;
    surface: { sunken: string };
  }
  interface TypeText {
    muted: string;
  }
}

const theme = createTheme({
  shape: { borderRadius: 8 },

  palette: {
    mode: 'light',
    primary: {
      main: warm.accent,
      dark: warm.accentHover,
      light: warm.accentSoft,
      contrastText: warm.surface,
    },
    background: { default: warm.page, paper: warm.surface },
    surface: { sunken: warm.sunken },
    text: {
      primary: warm.textPrimary,
      secondary: warm.textSecondary,
      muted: warm.textMuted,
    },
    divider: warm.border,
    tone,
  },

  typography: {
    fontFamily: bodyFont,
    // Display sizes stay monotonic: h1 44 -> h6 19. Page titles use h3,
    // the wordmark uses h6.
    h1: { fontFamily: displayFont, fontSize: '2.75rem', fontWeight: 600 },
    h2: { fontFamily: displayFont, fontSize: '2.25rem', fontWeight: 600 },
    h3: { fontFamily: displayFont, fontSize: '2rem', fontWeight: 600 },
    h4: { fontFamily: displayFont, fontSize: '1.625rem', fontWeight: 600 },
    h5: { fontFamily: displayFont, fontSize: '1.375rem', fontWeight: 600 },
    h6: { fontFamily: displayFont, fontSize: '1.1875rem', fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.8125rem', color: warm.textMuted },
    // Section labels ("FEED", "COMMUNITY") and any other eyebrow text.
    subtitle2: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.9px',
      textTransform: 'uppercase',
    },
    button: { fontSize: '0.875rem', fontWeight: 500, textTransform: 'none' },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: warm.page,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        // Keyboard position must be visible everywhere. Native elements keep
        // this global ring; ButtonBase zeroes `outline`, so its descendants
        // get the same ring back via the override below.
        ':focus-visible': {
          outline: `2px solid ${warm.accent}`,
          outlineOffset: '2px',
        },
      },
    },

    // One override covers Button, IconButton, ListItemButton, CardActionArea,
    // Checkbox - everything that inherits ButtonBase's `outline: 0`.
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: `2px solid ${warm.accent}`,
            outlineOffset: '2px',
          },
        },
      },
    },

    // Cream bar with a hairline rule - never MUI's default blue slab.
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: {
          backgroundColor: warm.surface,
          color: warm.textPrimary,
          borderBottom: `1px solid ${warm.border}`,
          backgroundImage: 'none',
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: warm.surface,
          borderRight: `1px solid ${warm.border}`,
          backgroundImage: 'none',
        },
      },
    },

    // Hairline border, no shadow. Editorial cards sit flat on the page.
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${warm.border}`,
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 6, boxShadow: 'none' },
        containedPrimary: { '&:hover': { backgroundColor: warm.accentHover } },
        textInherit: { color: warm.textSecondary },
      },
    },

    // Inset shadow rather than a real border, so the selected item does not
    // shift its content 3px to the right.
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '&:hover': { backgroundColor: warm.sunken },
          '&.Mui-selected': {
            backgroundColor: warm.accentSoft,
            boxShadow: `inset 3px 0 0 ${warm.accent}`,
            '&:hover': { backgroundColor: warm.accentSoft },
            '& .MuiListItemIcon-root': { color: warm.accent },
            '& .MuiListItemText-primary': {
              color: warm.accent,
              fontWeight: 500,
            },
          },
        },
      },
    },

    MuiListItemIcon: {
      styleOverrides: { root: { color: warm.textSecondary, minWidth: 34 } },
    },

    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: '0.875rem', color: warm.textSecondary },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: warm.border,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: warm.textMuted,
          },
        },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: warm.accentSoft,
          color: warm.accent,
          fontSize: '0.875rem',
          fontWeight: 600,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4, fontSize: '0.75rem', fontWeight: 500 },
        outlined: { borderColor: warm.border, color: warm.textSecondary },
      },
    },

    MuiDialog: {
      styleOverrides: { paper: { backgroundImage: 'none' } },
    },

    // Scoped to the default variant via ownerState: a plain `styleOverrides.root`
    // composes after MUI's built-in colour styles and would silently defeat
    // `color="error"` on destructive buttons. IconButton has no `colorDefault`
    // slot to target instead - it applies no colour slot at all for the default.
    MuiIconButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.color === 'default' && { color: warm.textMuted }),
        }),
      },
    },
  },
});

export default theme;
