// Elegant Spacing System
// Based on 8px grid system with golden ratio scaling

export const spacing = {
  // Base unit (8px)
  base: 8,
  
  // Spacing scale using 8px grid
  scale: {
    '0': '0px',
    '0.5': '2px',   // 0.25 * 8
    '1': '4px',     // 0.5 * 8
    '1.5': '6px',   // 0.75 * 8
    '2': '8px',     // 1 * 8
    '2.5': '10px',  // 1.25 * 8
    '3': '12px',    // 1.5 * 8
    '3.5': '14px',  // 1.75 * 8
    '4': '16px',    // 2 * 8
    '5': '20px',    // 2.5 * 8
    '6': '24px',    // 3 * 8
    '7': '28px',    // 3.5 * 8
    '8': '32px',    // 4 * 8
    '9': '36px',    // 4.5 * 8
    '10': '40px',   // 5 * 8
    '11': '44px',   // 5.5 * 8
    '12': '48px',   // 6 * 8
    '14': '56px',   // 7 * 8
    '16': '64px',   // 8 * 8
    '18': '72px',   // 9 * 8
    '20': '80px',   // 10 * 8
    '24': '96px',   // 12 * 8
    '28': '112px',  // 14 * 8
    '32': '128px',  // 16 * 8
    '36': '144px',  // 18 * 8
    '40': '160px',  // 20 * 8
    '44': '176px',  // 22 * 8
    '48': '192px',  // 24 * 8
    '52': '208px',  // 26 * 8
    '56': '224px',  // 28 * 8
    '60': '240px',  // 30 * 8
    '64': '256px',  // 32 * 8
    '72': '288px',  // 36 * 8
    '80': '320px',  // 40 * 8
    '96': '384px',  // 48 * 8
  },
  
  // Semantic spacing for different contexts
  semantic: {
    // Component internal spacing
    component: {
      xs: '4px',    // Very tight
      sm: '8px',    // Tight
      md: '16px',   // Default
      lg: '24px',   // Loose
      xl: '32px',   // Very loose
    },
    
    // Layout spacing
    layout: {
      xs: '16px',   // Minimal section spacing
      sm: '24px',   // Small section spacing
      md: '48px',   // Default section spacing
      lg: '64px',   // Large section spacing
      xl: '96px',   // Extra large section spacing
      '2xl': '128px', // Massive section spacing
    },
    
    // Container spacing
    container: {
      xs: '16px',   // Mobile padding
      sm: '24px',   // Small screen padding
      md: '32px',   // Medium screen padding
      lg: '48px',   // Large screen padding
      xl: '64px',   // Extra large screen padding
    },
    
    // Card spacing
    card: {
      xs: '12px',   // Compact card
      sm: '16px',   // Small card
      md: '24px',   // Default card
      lg: '32px',   // Large card
      xl: '40px',   // Extra large card
    },
    
    // Form spacing
    form: {
      field: '16px',     // Between form fields
      group: '24px',     // Between form groups
      section: '32px',   // Between form sections
      submit: '40px',    // Before submit button
    },
    
    // Typography spacing
    typography: {
      paragraph: '16px',    // Between paragraphs
      heading: '24px',      // After headings
      list: '8px',          // Between list items
      section: '48px',      // Between content sections
    },
  },
  
  // Responsive spacing utilities
  responsive: {
    mobile: {
      container: '16px',
      section: '32px',
      component: '12px',
    },
    tablet: {
      container: '24px',
      section: '48px',
      component: '16px',
    },
    desktop: {
      container: '32px',
      section: '64px',
      component: '20px',
    },
    wide: {
      container: '48px',
      section: '96px',
      component: '24px',
    },
  },
}

// Utility functions for spacing calculations
export const spacingUtils = {
  // Convert spacing scale to pixels
  toPx: (scale: keyof typeof spacing.scale): number => {
    return parseInt(spacing.scale[scale].replace('px', ''))
  },
  
  // Get spacing value by scale
  get: (scale: keyof typeof spacing.scale): string => {
    return spacing.scale[scale]
  },
  
  // Calculate spacing based on multiplier
  multiply: (scale: keyof typeof spacing.scale, multiplier: number): string => {
    const px = spacingUtils.toPx(scale)
    return `${px * multiplier}px`
  },
  
  // Get responsive spacing
  responsive: (breakpoint: keyof typeof spacing.responsive, type: 'container' | 'section' | 'component'): string => {
    return spacing.responsive[breakpoint][type]
  },
  
  // Get semantic spacing
  semantic: (category: keyof typeof spacing.semantic, size: string): string => {
    const categorySpacing = spacing.semantic[category] as any
    return categorySpacing[size] || spacing.semantic.component.md
  },
}

// CSS custom properties for spacing
export const spacingCSSVars = {
  // Generate CSS custom properties
  generate: (): Record<string, string> => {
    const vars: Record<string, string> = {}
    
    // Base spacing scale
    Object.entries(spacing.scale).forEach(([key, value]) => {
      vars[`--spacing-${key}`] = value
    })
    
    // Semantic spacing
    Object.entries(spacing.semantic).forEach(([category, sizes]) => {
      Object.entries(sizes).forEach(([size, value]) => {
        vars[`--spacing-${category}-${size}`] = value
      })
    })
    
    return vars
  },
}

// Export default spacing configuration
export default spacing