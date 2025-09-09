"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import typography from '@/lib/typography/elegant'

interface ElegantTextProps {
  children: React.ReactNode
  variant?: keyof typeof typography.typographyScale
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'
  color?: 'primary' | 'primary-muted' | 'primary-subtle' | 'secondary' | 'secondary-muted' | 'accent' | 'accent-muted'
  className?: string
  animate?: boolean
  gradient?: boolean
  weight?: keyof typeof typography.fontWeights
}

const ElegantText = React.forwardRef<HTMLElement, ElegantTextProps>(
  ({ 
    children, 
    variant = 'body.md', 
    as, 
    color = 'primary',
    className,
    animate = false,
    gradient = false,
    weight,
    ...props 
  }, ref) => {
    // Determine the HTML element based on variant or explicit 'as' prop
    const getElement = () => {
      if (as) return as
      
      if (variant.startsWith('display')) return 'h1'
      if (variant.startsWith('heading.h1')) return 'h1'
      if (variant.startsWith('heading.h2')) return 'h2'
      if (variant.startsWith('heading.h3')) return 'h3'
      if (variant.startsWith('heading.h4')) return 'h4'
      if (variant.startsWith('heading.h5')) return 'h5'
      if (variant.startsWith('heading.h6')) return 'h6'
      if (variant.startsWith('body')) return 'p'
      if (variant.startsWith('label')) return 'span'
      
      return 'p'
    }

    const Element = getElement()

    // Get typography classes based on variant
    const getVariantClasses = () => {
      const variantMap: Record<string, string> = {
        'display.2xl': 'text-display-2xl',
        'display.xl': 'text-display-xl',
        'display.lg': 'text-display-lg',
        'display.md': 'text-display-md',
        'display.sm': 'text-display-sm',
        'heading.h1': 'text-h1',
        'heading.h2': 'text-h2',
        'heading.h3': 'text-h3',
        'heading.h4': 'text-h4',
        'heading.h5': 'text-h5',
        'heading.h6': 'text-h6',
        'body.xl': 'text-body-xl',
        'body.lg': 'text-body-lg',
        'body.md': 'text-body-md',
        'body.sm': 'text-body-sm',
        'body.xs': 'text-body-xs',
        'label.lg': 'text-label-lg',
        'label.md': 'text-label-md',
        'label.sm': 'text-label-sm',
      }
      
      return variantMap[variant] || 'text-body-md'
    }

    const getColorClasses = () => {
      const colorMap: Record<string, string> = {
        'primary': 'text-primary',
        'primary-muted': 'text-primary-muted',
        'primary-subtle': 'text-primary-subtle',
        'secondary': 'text-secondary',
        'secondary-muted': 'text-secondary-muted',
        'accent': 'text-accent',
        'accent-muted': 'text-accent-muted',
      }
      
      return colorMap[color] || 'text-primary'
    }

    const getWeightClasses = () => {
      if (!weight) return ''
      
      const weightMap: Record<string, string> = {
        'thin': 'font-thin',
        'light': 'font-light',
        'normal': 'font-normal',
        'medium': 'font-medium',
        'semibold': 'font-semibold',
        'bold': 'font-bold',
        'extrabold': 'font-extrabold',
        'black': 'font-black',
      }
      
      return weightMap[weight] || ''
    }

    const classes = cn(
      getVariantClasses(),
      getColorClasses(),
      getWeightClasses(),
      {
        'animate-fade-in-up': animate,
        'bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent': gradient,
      },
      className
    )

    return React.createElement(
      Element,
      {
        ref,
        className: classes,
        ...props
      },
      children
    )
  }
)

ElegantText.displayName = 'ElegantText'

export { ElegantText }
export type { ElegantTextProps }