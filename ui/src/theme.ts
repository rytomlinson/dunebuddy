export const theme = {
  colors: {
    primary: '#D9822B',
    primaryHover: '#E8963F',
    primaryActive: '#B96A1C',
    background: '#16110C',
    surface: '#221A12',
    surfaceHover: '#2E2318',
    border: '#3E3022',
    text: '#F3E9DA',
    textSecondary: '#C9B79F',
    textMuted: '#8F7D66',
    error: '#E5534B',
    success: '#6FB36F',
    warning: '#E2B33C',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  fontSizes: {
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '20px',
    xxl: '28px',
  },
} as const;

export type Theme = typeof theme;
