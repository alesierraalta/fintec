'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ElegantGradientProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'glass' | 'aurora' | 'sunset' | 'ocean'
  type?: 'background' | 'text' | 'border' | 'radial'
  intensity?: 'light' | 'normal' | 'vibrant'
  className?: string
  animate?: boolean
  glow?: boolean
  as?: keyof JSX.IntrinsicElements
}

const gradientClasses = {
  background: {
    primary: {
      light: 'bg-gradient-primary-light',
      normal: 'bg-gradient-primary',
      vibrant: 'bg-gradient-primary-vibrant'
    },
    secondary: {
      light: 'bg-gradient-secondary-light',
      normal: 'bg-gradient-secondary',
      vibrant: 'bg-gradient-secondary'
    },
    accent: {
      light: 'bg-gradient-accent',
      normal: 'bg-gradient-accent',
      vibrant: 'bg-gradient-accent-vibrant'
    },
    success: {
      light: 'bg-gradient-success',
      normal: 'bg-gradient-success',
      vibrant: 'bg-gradient-success'
    },
    warning: {
      light: 'bg-gradient-warning',
      normal: 'bg-gradient-warning',
      vibrant: 'bg-gradient-warning'
    },
    error: {
      light: 'bg-gradient-error',
      normal: 'bg-gradient-error',
      vibrant: 'bg-gradient-error'
    },
    glass: {
      light: 'bg-gradient-glass',
      normal: 'bg-gradient-glass',
      vibrant: 'bg-gradient-glass'
    },
    aurora: {
      light: 'bg-gradient-aurora',
      normal: 'bg-gradient-aurora',
      vibrant: 'bg-gradient-aurora'
    },
    sunset: {
      light: 'bg-gradient-sunset',
      normal: 'bg-gradient-sunset',
      vibrant: 'bg-gradient-sunset'
    },
    ocean: {
      light: 'bg-gradient-ocean',
      normal: 'bg-gradient-ocean',
      vibrant: 'bg-gradient-ocean'
    }
  },
  text: {
    primary: {
      light: 'text-gradient-primary',
      normal: 'text-gradient-primary',
      vibrant: 'text-gradient-primary'
    },
    secondary: {
      light: 'text-gradient-primary',
      normal: 'text-gradient-primary',
      vibrant: 'text-gradient-primary'
    },
    accent: {
      light: 'text-gradient-accent',
      normal: 'text-gradient-accent',
      vibrant: 'text-gradient-accent'
    },
    success: {
      light: 'text-gradient-primary',
      normal: 'text-gradient-primary',
      vibrant: 'text-gradient-primary'
    },
    warning: {
      light: 'text-gradient-sunset',
      normal: 'text-gradient-sunset',
      vibrant: 'text-gradient-sunset'
    },
    error: {
      light: 'text-gradient-sunset',
      normal: 'text-gradient-sunset',
      vibrant: 'text-gradient-sunset'
    },
    glass: {
      light: 'text-gradient-primary',
      normal: 'text-gradient-primary',
      vibrant: 'text-gradient-primary'
    },
    aurora: {
      light: 'text-gradient-aurora',
      normal: 'text-gradient-aurora',
      vibrant: 'text-gradient-aurora'
    },
    sunset: {
      light: 'text-gradient-sunset',
      normal: 'text-gradient-sunset',
      vibrant: 'text-gradient-sunset'
    },
    ocean: {
      light: 'text-gradient-primary',
      normal: 'text-gradient-primary',
      vibrant: 'text-gradient-primary'
    }
  },
  border: {
    primary: {
      light: 'border-gradient-primary',
      normal: 'border-gradient-primary',
      vibrant: 'border-gradient-primary'
    },
    secondary: {
      light: 'border-gradient-primary',
      normal: 'border-gradient-primary',
      vibrant: 'border-gradient-primary'
    },
    accent: {
      light: 'border-gradient-accent',
      normal: 'border-gradient-accent',
      vibrant: 'border-gradient-accent'
    },
    success: {
      light: 'border-gradient-primary',
      normal: 'border-gradient-primary',
      vibrant: 'border-gradient-primary'
    },
    warning: {
      light: 'border-gradient-accent',
      normal: 'border-gradient-accent',
      vibrant: 'border-gradient-accent'
    },
    error: {
      light: 'border-gradient-accent',
      normal: 'border-gradient-accent',
      vibrant: 'border-gradient-accent'
    },
    glass: {
      light: 'border-gradient-primary',
      normal: 'border-gradient-primary',
      vibrant: 'border-gradient-primary'
    },
    aurora: {
      light: 'border-gradient-accent',
      normal: 'border-gradient-accent',
      vibrant: 'border-gradient-accent'
    },
    sunset: {
      light: 'border-gradient-accent',
      normal: 'border-gradient-accent',
      vibrant: 'border-gradient-accent'
    },
    ocean: {
      light: 'border-gradient-primary',
      normal: 'border-gradient-primary',
      vibrant: 'border-gradient-primary'
    }
  },
  radial: {
    primary: {
      light: 'bg-radial-primary',
      normal: 'bg-radial-primary',
      vibrant: 'bg-radial-primary'
    },
    secondary: {
      light: 'bg-radial-primary',
      normal: 'bg-radial-primary',
      vibrant: 'bg-radial-primary'
    },
    accent: {
      light: 'bg-radial-accent',
      normal: 'bg-radial-accent',
      vibrant: 'bg-radial-accent'
    },
    success: {
      light: 'bg-radial-primary',
      normal: 'bg-radial-primary',
      vibrant: 'bg-radial-primary'
    },
    warning: {
      light: 'bg-radial-accent',
      normal: 'bg-radial-accent',
      vibrant: 'bg-radial-accent'
    },
    error: {
      light: 'bg-radial-accent',
      normal: 'bg-radial-accent',
      vibrant: 'bg-radial-accent'
    },
    glass: {
      light: 'bg-radial-glow',
      normal: 'bg-radial-glow',
      vibrant: 'bg-radial-glow'
    },
    aurora: {
      light: 'bg-radial-accent',
      normal: 'bg-radial-accent',
      vibrant: 'bg-radial-accent'
    },
    sunset: {
      light: 'bg-radial-accent',
      normal: 'bg-radial-accent',
      vibrant: 'bg-radial-accent'
    },
    ocean: {
      light: 'bg-radial-primary',
      normal: 'bg-radial-primary',
      vibrant: 'bg-radial-primary'
    }
  }
}

const shadowClasses = {
  primary: 'shadow-primary',
  secondary: 'shadow-primary',
  accent: 'shadow-accent',
  success: 'shadow-success',
  warning: 'shadow-warning',
  error: 'shadow-error',
  glass: 'shadow-primary',
  aurora: 'shadow-accent',
  sunset: 'shadow-warning',
  ocean: 'shadow-primary'
}

export function ElegantGradient({
  children,
  variant = 'primary',
  type = 'background',
  intensity = 'normal',
  className,
  animate = false,
  glow = false,
  as: Component = 'div'
}: ElegantGradientProps) {
  const gradientClass = gradientClasses[type]?.[variant]?.[intensity] || ''
  const shadowClass = glow ? shadowClasses[variant] : ''
  
  return (
    <Component
      className={cn(
        gradientClass,
        shadowClass,
        animate && 'color-shift',
        'transition-smooth',
        className
      )}
    >
      {children}
    </Component>
  )
}

// Specialized gradient components
export function GradientText({
  children,
  variant = 'primary',
  intensity = 'normal',
  animate = false,
  className
}: Omit<ElegantGradientProps, 'type' | 'as'>) {
  return (
    <ElegantGradient
      variant={variant}
      type="text"
      intensity={intensity}
      animate={animate}
      className={cn('font-semibold', className)}
      as="span"
    >
      {children}
    </ElegantGradient>
  )
}

export function GradientCard({
  children,
  variant = 'primary',
  intensity = 'light',
  glow = true,
  className
}: Omit<ElegantGradientProps, 'type'>) {
  return (
    <ElegantGradient
      variant={variant}
      type="background"
      intensity={intensity}
      glow={glow}
      animate
      className={cn(
        'rounded-2xl p-6 backdrop-blur-xl border border-white/10',
        'hover-lift transition-smooth',
        className
      )}
    >
      {children}
    </ElegantGradient>
  )
}

export function GradientButton({
  children,
  variant = 'primary',
  intensity = 'normal',
  glow = true,
  className,
  ...props
}: Omit<ElegantGradientProps, 'type'> & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <ElegantGradient
      variant={variant}
      type="background"
      intensity={intensity}
      glow={glow}
      animate
      className={cn(
        'px-6 py-3 rounded-xl font-medium text-white',
        'hover-lift micro-bounce transition-smooth',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variant === 'primary' && 'focus:ring-primary-500',
        variant === 'accent' && 'focus:ring-accent-500',
        className
      )}
      as="button"
      {...props}
    >
      {children}
    </ElegantGradient>
  )
}

export default ElegantGradient