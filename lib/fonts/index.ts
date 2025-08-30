// Import Inter font from Fontsource
import '@fontsource/inter/400.css'; // Regular
import '@fontsource/inter/500.css'; // Medium
import '@fontsource/inter/600.css'; // Semi-bold
import '@fontsource/inter/700.css'; // Bold

// Font configurations
export const fontConfig = {
  primary: {
    name: 'Inter',
    fallback: [
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'Droid Sans',
      'Helvetica Neue',
      'sans-serif',
    ],
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  mono: {
    name: 'SF Mono',
    fallback: [
      'Monaco',
      'Inconsolata',
      'Roboto Mono',
      'Oxygen Mono',
      'Ubuntu Monospace',
      'Source Code Pro',
      'Fira Mono',
      'Droid Sans Mono',
      'Courier New',
      'monospace',
    ],
  },
} as const;

// Generate CSS font-family strings
export const fontFamilies = {
  primary: `"${fontConfig.primary.name}", ${fontConfig.primary.fallback.join(', ')}`,
  mono: `"${fontConfig.mono.name}", ${fontConfig.mono.fallback.join(', ')}`,
} as const;

// Typography scale for consistent text sizing
export const typography = {
  // Font sizes (in rem)
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
    '7xl': '4.5rem',   // 72px
    '8xl': '6rem',     // 96px
    '9xl': '8rem',     // 128px
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// Predefined text styles for common use cases
export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h3: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.tight,
  },
  h4: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.normal,
  },
  h5: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.normal,
  },
  h6: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },

  // Body text
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.normal,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },

  // Labels and captions
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.wide,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.wide,
  },

  // UI elements
  button: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.none,
    letterSpacing: typography.letterSpacing.wide,
  },
  buttonLarge: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.none,
    letterSpacing: typography.letterSpacing.normal,
  },
  link: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },

  // Financial specific
  currency: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.none,
    letterSpacing: typography.letterSpacing.tight,
  },
  currencyLarge: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.none,
    letterSpacing: typography.letterSpacing.tight,
  },
  amount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.none,
    letterSpacing: typography.letterSpacing.normal,
    fontFamily: fontFamilies.mono,
  },
  amountLarge: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.none,
    letterSpacing: typography.letterSpacing.tight,
    fontFamily: fontFamilies.mono,
  },

  // Code and data
  code: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
    fontFamily: fontFamilies.mono,
  },
  codeBlock: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.normal,
    fontFamily: fontFamilies.mono,
  },
} as const;

// Responsive typography utilities
export const responsiveTextStyles = {
  // Mobile-first responsive headings
  h1Responsive: {
    fontSize: typography.fontSize['2xl'],
    '@media (min-width: 640px)': {
      fontSize: typography.fontSize['3xl'],
    },
    '@media (min-width: 1024px)': {
      fontSize: typography.fontSize['4xl'],
    },
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2Responsive: {
    fontSize: typography.fontSize.xl,
    '@media (min-width: 640px)': {
      fontSize: typography.fontSize['2xl'],
    },
    '@media (min-width: 1024px)': {
      fontSize: typography.fontSize['3xl'],
    },
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h3Responsive: {
    fontSize: typography.fontSize.lg,
    '@media (min-width: 640px)': {
      fontSize: typography.fontSize.xl,
    },
    '@media (min-width: 1024px)': {
      fontSize: typography.fontSize['2xl'],
    },
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.tight,
  },
} as const;

// CSS custom properties for typography
export const typographyCSSVars = `
  :root {
    --font-primary: ${fontFamilies.primary};
    --font-mono: ${fontFamilies.mono};
    
    /* Font sizes */
    --text-xs: ${typography.fontSize.xs};
    --text-sm: ${typography.fontSize.sm};
    --text-base: ${typography.fontSize.base};
    --text-lg: ${typography.fontSize.lg};
    --text-xl: ${typography.fontSize.xl};
    --text-2xl: ${typography.fontSize['2xl']};
    --text-3xl: ${typography.fontSize['3xl']};
    --text-4xl: ${typography.fontSize['4xl']};
    
    /* Font weights */
    --font-normal: ${typography.fontWeight.normal};
    --font-medium: ${typography.fontWeight.medium};
    --font-semibold: ${typography.fontWeight.semibold};
    --font-bold: ${typography.fontWeight.bold};
    
    /* Line heights */
    --leading-none: ${typography.lineHeight.none};
    --leading-tight: ${typography.lineHeight.tight};
    --leading-snug: ${typography.lineHeight.snug};
    --leading-normal: ${typography.lineHeight.normal};
    --leading-relaxed: ${typography.lineHeight.relaxed};
    --leading-loose: ${typography.lineHeight.loose};
    
    /* Letter spacing */
    --tracking-tighter: ${typography.letterSpacing.tighter};
    --tracking-tight: ${typography.letterSpacing.tight};
    --tracking-normal: ${typography.letterSpacing.normal};
    --tracking-wide: ${typography.letterSpacing.wide};
    --tracking-wider: ${typography.letterSpacing.wider};
    --tracking-widest: ${typography.letterSpacing.widest};
  }
`;

// Utility function to generate CSS from text style objects
export const generateTextStyleCSS = (style: any) => {
  return Object.entries(style)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
};

// Font loading optimization
export const fontOptimization = {
  preload: [
    {
      href: '/fonts/inter-400.woff2',
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      href: '/fonts/inter-500.woff2',
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      href: '/fonts/inter-600.woff2',
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
  ],
  display: 'swap', // Use font-display: swap for better performance
};

const fontConfiguration = {
  fontConfig,
  fontFamilies,
  typography,
  textStyles,
};

export default fontConfiguration;
