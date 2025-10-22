/**
 * Advanced Animation Utilities for Elegant UI
 * Provides sophisticated animations and microinteractions
 */

// Easing functions for smooth animations
export const easings = {
  // iOS-style easing curves
  ios: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  iosSpring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  iosDecelerate: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  iosAccelerate: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  
  // Material Design easing
  material: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  materialDecelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  materialAccelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  
  // Custom elegant curves
  elegant: 'cubic-bezier(0.23, 1, 0.32, 1)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Animation durations
export const durations = {
  instant: '0ms',
  fast: '150ms',
  normal: '250ms',
  slow: '350ms',
  slower: '500ms',
  slowest: '750ms',
};

// Stagger delays for sequential animations
export const staggerDelays = {
  xs: '50ms',
  sm: '100ms',
  md: '150ms',
  lg: '200ms',
  xl: '300ms',
};

// Advanced animation classes
export const animations = {
  // Entrance animations
  fadeInUp: {
    from: { opacity: '0', transform: 'translateY(20px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  fadeInDown: {
    from: { opacity: '0', transform: 'translateY(-20px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  fadeInLeft: {
    from: { opacity: '0', transform: 'translateX(-20px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  fadeInRight: {
    from: { opacity: '0', transform: 'translateX(20px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.9)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  slideInUp: {
    from: { transform: 'translateY(100%)' },
    to: { transform: 'translateY(0)' },
  },
  
  // Microinteractions
  pulse: {
    '0%, 100%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
  },
  heartbeat: {
    '0%, 50%, 100%': { transform: 'scale(1)' },
    '25%': { transform: 'scale(1.1)' },
    '75%': { transform: 'scale(1.05)' },
  },
  wiggle: {
    '0%, 100%': { transform: 'rotate(0deg)' },
    '25%': { transform: 'rotate(-3deg)' },
    '75%': { transform: 'rotate(3deg)' },
  },
  
  // Loading animations
  shimmer: {
    '0%': { backgroundPosition: '-200px 0' },
    '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
  },
  skeleton: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  
  // Hover effects
  liftUp: {
    from: { transform: 'translateY(0) scale(1)' },
    to: { transform: 'translateY(-4px) scale(1.02)' },
  },
  glow: {
    '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
    '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
  },
};

// Utility functions for dynamic animations
export const createStaggeredAnimation = (delay: string, duration: string = durations.normal) => ({
  animationDelay: delay,
  animationDuration: duration,
  animationFillMode: 'both',
});

export const createHoverAnimation = (scale: number = 1.02, translateY: number = -2) => ({
  transition: `all ${durations.normal} ${easings.ios}`,
  '&:hover': {
    transform: `translateY(${translateY}px) scale(${scale})`,
  },
});

export const createFocusAnimation = (ringColor: string = 'rgba(59, 130, 246, 0.5)') => ({
  transition: `all ${durations.fast} ${easings.ios}`,
  '&:focus': {
    outline: 'none',
    boxShadow: `0 0 0 3px ${ringColor}`,
  },
});

// Glass morphism effect
export const glassMorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  dark: {
    background: 'rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
};

// Gradient animations
export const gradientAnimations = {
  shimmerGradient: {
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
    backgroundSize: '200px 100%',
    animation: `shimmer 2s infinite ${easings.ios}`,
  },
  movingGradient: {
    backgroundSize: '200% 200%',
    animation: `gradient 3s ease infinite`,
  },
};

// Export all animation utilities
const advancedAnimations = {
  easings,
  durations,
  staggerDelays,
  animations,
  createStaggeredAnimation,
  createHoverAnimation,
  createFocusAnimation,
  glassMorphism,
  gradientAnimations,
};

export default advancedAnimations;
