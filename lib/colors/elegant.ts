// Elegant Color System
// Sophisticated color palette with gradients and transparencies

export const colors = {
  // Base color palette
  base: {
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
  },
  
  // Primary brand colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  
  // Secondary colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  
  // Accent colors
  accent: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e',
  },
  
  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  
  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  
  // Neutral grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
}

// Gradient definitions
export const gradients = {
  // Primary gradients
  primary: {
    light: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    medium: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    dark: 'linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)',
    vibrant: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)',
  },
  
  // Secondary gradients
  secondary: {
    light: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    medium: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    dark: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    subtle: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
  },
  
  // Accent gradients
  accent: {
    light: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)',
    medium: 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)',
    dark: 'linear-gradient(135deg, #a21caf 0%, #701a75 100%)',
    vibrant: 'linear-gradient(135deg, #f0abfc 0%, #e879f9 50%, #d946ef 100%)',
  },
  
  // Status gradients
  success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  
  // Special gradients
  glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
  shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
  aurora: 'linear-gradient(135deg, #0ea5e9 0%, #d946ef 25%, #f59e0b 50%, #22c55e 75%, #0ea5e9 100%)',
  sunset: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #d946ef 100%)',
  ocean: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
  
  // Radial gradients
  radial: {
    primary: 'radial-gradient(circle at center, #0ea5e9 0%, #0284c7 100%)',
    accent: 'radial-gradient(circle at center, #d946ef 0%, #a21caf 100%)',
    glow: 'radial-gradient(circle at center, rgba(14, 165, 233, 0.3) 0%, transparent 70%)',
  },
}

// Transparency utilities
export const transparency = {
  // Alpha values
  alpha: {
    0: '00',
    5: '0D',
    10: '1A',
    20: '33',
    25: '40',
    30: '4D',
    40: '66',
    50: '80',
    60: '99',
    70: 'B3',
    75: 'BF',
    80: 'CC',
    90: 'E6',
    95: 'F2',
    100: 'FF',
  },
  
  // CSS opacity values
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    25: '0.25',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    75: '0.75',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
  },
}

// Color utilities
export const colorUtils = {
  // Add alpha to hex color
  addAlpha: (hex: string, alpha: keyof typeof transparency.alpha): string => {
    const cleanHex = hex.replace('#', '')
    return `#${cleanHex}${transparency.alpha[alpha]}`
  },
  
  // Convert hex to RGB
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  },
  
  // Convert hex to RGBA
  hexToRgba: (hex: string, alpha: number): string => {
    const rgb = colorUtils.hexToRgb(hex)
    return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex
  },
  
  // Get color with opacity
  withOpacity: (color: string, opacity: keyof typeof transparency.opacity): string => {
    if (color.startsWith('#')) {
      return colorUtils.hexToRgba(color, parseFloat(transparency.opacity[opacity]))
    }
    return color
  },
  
  // Get contrasting text color
  getContrastColor: (hex: string): string => {
    const rgb = colorUtils.hexToRgb(hex)
    if (!rgb) return colors.neutral[900]
    
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
    return brightness > 128 ? colors.neutral[900] : colors.base.white
  },
}

// Theme color mappings
export const themeColors = {
  light: {
    background: colors.base.white,
    foreground: colors.neutral[900],
    card: colors.base.white,
    cardForeground: colors.neutral[900],
    popover: colors.base.white,
    popoverForeground: colors.neutral[900],
    primary: colors.primary[600],
    primaryForeground: colors.base.white,
    secondary: colors.secondary[100],
    secondaryForeground: colors.secondary[900],
    muted: colors.secondary[100],
    mutedForeground: colors.secondary[500],
    accent: colors.accent[100],
    accentForeground: colors.accent[900],
    destructive: colors.error[500],
    destructiveForeground: colors.base.white,
    border: colors.secondary[200],
    input: colors.secondary[200],
    ring: colors.primary[600],
  },
  
  dark: {
    background: colors.neutral[950],
    foreground: colors.neutral[50],
    card: colors.neutral[950],
    cardForeground: colors.neutral[50],
    popover: colors.neutral[950],
    popoverForeground: colors.neutral[50],
    primary: colors.primary[500],
    primaryForeground: colors.primary[950],
    secondary: colors.secondary[800],
    secondaryForeground: colors.secondary[50],
    muted: colors.secondary[800],
    mutedForeground: colors.secondary[400],
    accent: colors.accent[800],
    accentForeground: colors.accent[50],
    destructive: colors.error[900],
    destructiveForeground: colors.error[50],
    border: colors.secondary[800],
    input: colors.secondary[800],
    ring: colors.primary[300],
  },
}

// Export default colors
export default colors
