/**
 * Elegant Typography System
 * Provides sophisticated typography utilities with refined spacing and hierarchy
 */

// Font weights with semantic names
export const fontWeights = {
  thin: '100',
  extraLight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
} as const;

// Font sizes with golden ratio scaling
export const fontSizes = {
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
} as const;

// Line heights for optimal readability
export const lineHeights = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

// Letter spacing for refined typography
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// Typography scale with semantic naming
export const typographyScale = {
  // Display text - for hero sections and major headings
  display: {
    '2xl': {
      fontSize: fontSizes['8xl'],
      lineHeight: lineHeights.none,
      letterSpacing: letterSpacing.tighter,
      fontWeight: fontWeights.black,
    },
    xl: {
      fontSize: fontSizes['7xl'],
      lineHeight: lineHeights.none,
      letterSpacing: letterSpacing.tighter,
      fontWeight: fontWeights.extraBold,
    },
    lg: {
      fontSize: fontSizes['6xl'],
      lineHeight: lineHeights.none,
      letterSpacing: letterSpacing.tight,
      fontWeight: fontWeights.bold,
    },
    md: {
      fontSize: fontSizes['5xl'],
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.tight,
      fontWeight: fontWeights.bold,
    },
    sm: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.semiBold,
    },
  },
  
  // Headings - for section titles and content hierarchy
  heading: {
    h1: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.tight,
      fontWeight: fontWeights.bold,
    },
    h2: {
      fontSize: fontSizes['3xl'],
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.tight,
      fontWeight: fontWeights.semiBold,
    },
    h3: {
      fontSize: fontSizes['2xl'],
      lineHeight: lineHeights.snug,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.semiBold,
    },
    h4: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.snug,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
    },
    h5: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
    },
    h6: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.wide,
      fontWeight: fontWeights.semiBold,
      textTransform: 'uppercase' as const,
    },
  },
  
  // Body text - for content and descriptions
  body: {
    xl: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.relaxed,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
    },
    lg: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.relaxed,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
    },
    md: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
    },
    sm: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
    },
    xs: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.wide,
      fontWeight: fontWeights.medium,
    },
  },
  
  // Labels and UI text
  label: {
    lg: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.wide,
      fontWeight: fontWeights.semiBold,
      textTransform: 'uppercase' as const,
    },
    md: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.wider,
      fontWeight: fontWeights.semiBold,
      textTransform: 'uppercase' as const,
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.none,
      letterSpacing: letterSpacing.widest,
      fontWeight: fontWeights.bold,
      textTransform: 'uppercase' as const,
    },
  },
  
  // Code and monospace text
  code: {
    lg: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    md: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
  },
};

// Utility functions for dynamic typography
export const createTypographyStyle = (scale: keyof typeof typographyScale, size: string) => {
  const scaleObj = typographyScale[scale] as Record<string, any>;
  return scaleObj[size] || scaleObj.md || {};
};

export const getResponsiveTypography = (baseSize: string, smSize?: string, mdSize?: string, lgSize?: string) => {
  return {
    fontSize: baseSize,
    '@media (min-width: 640px)': smSize ? { fontSize: smSize } : {},
    '@media (min-width: 768px)': mdSize ? { fontSize: mdSize } : {},
    '@media (min-width: 1024px)': lgSize ? { fontSize: lgSize } : {},
  };
};

// Text color utilities with opacity variants
export const textColors = {
  primary: {
    DEFAULT: 'rgb(var(--foreground))',
    muted: 'rgb(var(--foreground) / 0.7)',
    subtle: 'rgb(var(--foreground) / 0.5)',
    disabled: 'rgb(var(--foreground) / 0.3)',
  },
  secondary: {
    DEFAULT: 'rgb(var(--muted-foreground))',
    muted: 'rgb(var(--muted-foreground) / 0.8)',
    subtle: 'rgb(var(--muted-foreground) / 0.6)',
  },
  accent: {
    DEFAULT: 'rgb(var(--primary))',
    muted: 'rgb(var(--primary) / 0.8)',
    subtle: 'rgb(var(--primary) / 0.6)',
  },
  success: {
    DEFAULT: 'rgb(var(--success))',
    muted: 'rgb(var(--success) / 0.8)',
  },
  warning: {
    DEFAULT: 'rgb(var(--warning))',
    muted: 'rgb(var(--warning) / 0.8)',
  },
  error: {
    DEFAULT: 'rgb(var(--destructive))',
    muted: 'rgb(var(--destructive) / 0.8)',
  },
};

// Export all typography utilities
const elegantTypography = {
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacing,
  typographyScale,
  createTypographyStyle,
  getResponsiveTypography,
  textColors,
};

export default elegantTypography;
