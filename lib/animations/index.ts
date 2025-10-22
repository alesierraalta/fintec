import { Variants, Transition } from 'framer-motion';

// Common easing functions
export const easings = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  spring: { type: 'spring', damping: 20, stiffness: 300 },
  gentle: { type: 'spring', damping: 25, stiffness: 400 },
  snappy: { type: 'spring', damping: 30, stiffness: 500 },
} as const;

// Common durations
export const durations = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

// Page transitions
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Modal animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 400,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Modal backdrop
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: durations.fast }
  },
  exit: { 
    opacity: 0,
    transition: { duration: durations.fast }
  },
};

// Card animations
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  hover: {
    y: -5,
    scale: 1.02,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
};

// Button animations
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
    },
  },
  disabled: {
    scale: 1,
    opacity: 0.6,
  },
};

// List item animations
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  hover: {
    x: 5,
    transition: {
      duration: durations.fast,
    },
  },
};

// Stagger animations for lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Sidebar animations
export const sidebarVariants: Variants = {
  open: {
    x: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 400,
    },
  },
  closed: {
    x: '-100%',
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 400,
    },
  },
};

// Mobile navigation animations
export const mobileNavVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 500,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeIn,
    },
  },
};

// Notification animations
export const notificationVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -50,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 400,
    },
  },
  exit: {
    opacity: 0,
    x: 300,
    scale: 0.8,
    transition: {
      duration: durations.normal,
      ease: easings.easeIn,
    },
  },
};

// Form field animations
export const fieldVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  error: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
    },
  },
};

// Loading animations
export const loadingVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Pulse animation for loading states
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: easings.easeInOut,
    },
  },
};

// Chart animations
export const chartVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 1.5,
        ease: easings.easeInOut,
      },
      opacity: {
        duration: 0.5,
      },
    },
  },
};

// Success/Error state animations
export const statusVariants: Variants = {
  success: {
    scale: [1, 1.2, 1],
    rotate: [0, 10, -10, 0],
    transition: {
      duration: 0.6,
      ease: easings.bounce,
    },
  },
  error: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
    },
  },
};

// Floating action button animations
export const fabVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -180,
  },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 300,
    },
  },
  hover: {
    scale: 1.1,
    rotate: 90,
    transition: {
      duration: durations.fast,
    },
  },
  tap: {
    scale: 0.9,
  },
};

// Slide animations for mobile screens
export const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

// Transaction item animations
export const transactionItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  hover: {
    scale: 1.02,
    x: 5,
    transition: {
      duration: durations.fast,
    },
  },
  swipeLeft: {
    x: -100,
    opacity: 0.5,
    transition: {
      duration: durations.fast,
    },
  },
  swipeRight: {
    x: 100,
    opacity: 0.5,
    transition: {
      duration: durations.fast,
    },
  },
};

// Progress bar animations
export const progressVariants: Variants = {
  hidden: {
    scaleX: 0,
    originX: 0,
  },
  visible: (progress: number) => ({
    scaleX: progress / 100,
    transition: {
      duration: durations.slow,
      ease: easings.easeOut,
    },
  }),
};

// Common transition presets
export const transitions = {
  default: {
    type: 'tween',
    duration: durations.normal,
    ease: easings.easeOut,
  } as Transition,
  
  spring: {
    type: 'spring',
    damping: 25,
    stiffness: 400,
  } as Transition,
  
  bouncy: {
    type: 'spring',
    damping: 15,
    stiffness: 300,
  } as Transition,
  
  quick: {
    type: 'tween',
    duration: durations.fast,
    ease: easings.easeOut,
  } as Transition,
};

// Utility functions
export const createStaggerTransition = (staggerChildren = 0.1, delayChildren = 0) => ({
  staggerChildren,
  delayChildren,
});

export const createSpringTransition = (damping = 25, stiffness = 400) => ({
  type: 'spring' as const,
  damping,
  stiffness,
});

export const createTweenTransition = (duration = durations.normal, ease = easings.easeOut) => ({
  type: 'tween' as const,
  duration,
  ease,
});

// Layout animations
export const layoutTransition = {
  type: 'spring',
  damping: 30,
  stiffness: 500,
} as Transition;
