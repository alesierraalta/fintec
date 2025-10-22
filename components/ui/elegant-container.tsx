"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { spacing } from '@/lib/spacing/elegant'

interface ElegantContainerProps {
  children: React.ReactNode
  variant?: 'component' | 'layout' | 'card' | 'form'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  spacing?: 'padding' | 'gap' | 'both'
  responsive?: boolean
  flow?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  breathingRoom?: boolean
  className?: string
  as?: keyof JSX.IntrinsicElements
}

const ElegantContainer = React.forwardRef<HTMLElement, ElegantContainerProps>(
  ({ 
    children, 
    variant = 'component',
    size = 'md',
    spacing = 'padding',
    responsive = false,
    flow,
    breathingRoom = false,
    className,
    as = 'div',
    ...props 
  }, ref) => {
    
    const getSpacingClasses = () => {
      const classes: string[] = []
      
      // Base spacing classes
      if (spacing === 'padding' || spacing === 'both') {
        if (variant === 'component') {
          classes.push(`p-component-${size}`)
        } else if (variant === 'layout') {
          classes.push(`p-layout-${size}`)
        } else if (variant === 'card') {
          classes.push(`p-card-${size}`)
        } else if (variant === 'form') {
          classes.push('space-form-field')
        }
      }
      
      if (spacing === 'gap' || spacing === 'both') {
        if (variant === 'component') {
          classes.push(`space-component-${size}`)
        } else if (variant === 'layout') {
          classes.push(`space-layout-${size}`)
        } else if (variant === 'form') {
          classes.push('space-form-group')
        }
      }
      
      // Responsive spacing
      if (responsive) {
        classes.push('container-responsive', 'py-section-responsive', 'space-responsive')
      }
      
      // Strategic white space flow
      if (flow) {
        classes.push('whitespace-strategic')
      }
      
      // Breathing room
      if (breathingRoom) {
        classes.push(`breathing-room-${size}`)
      }
      
      return classes
    }

    const Element = as
    const spacingClasses = getSpacingClasses()
    
    const containerProps = {
      ref,
      className: cn(
        // Base container styles
        'relative',
        
        // Spacing classes
        ...spacingClasses,
        
        // Custom className
        className
      ),
      
      // Flow data attribute for strategic white space
      ...(flow && { 'data-flow': flow }),
      
      ...props
    }

    return React.createElement(Element, containerProps, children)
  }
)

ElegantContainer.displayName = 'ElegantContainer'

// Specialized container components
const Section = React.forwardRef<HTMLElement, Omit<ElegantContainerProps, 'variant'>>(
  (props, ref) => (
    <ElegantContainer 
      ref={ref} 
      variant="layout" 
      as="section" 
      responsive 
      {...props} 
    />
  )
)
Section.displayName = 'Section'

const Container = React.forwardRef<HTMLElement, Omit<ElegantContainerProps, 'variant'>>(
  (props, ref) => (
    <ElegantContainer 
      ref={ref} 
      variant="component" 
      responsive 
      {...props} 
    />
  )
)
Container.displayName = 'Container'

const CardContainer = React.forwardRef<HTMLElement, Omit<ElegantContainerProps, 'variant'>>(
  (props, ref) => (
    <ElegantContainer 
      ref={ref} 
      variant="card" 
      breathingRoom 
      {...props} 
    />
  )
)
CardContainer.displayName = 'CardContainer'

const FormContainer = React.forwardRef<HTMLElement, Omit<ElegantContainerProps, 'variant'>>(
  (props, ref) => (
    <ElegantContainer 
      ref={ref} 
      variant="form" 
      spacing="gap" 
      flow="md" 
      {...props} 
    />
  )
)
FormContainer.displayName = 'FormContainer'

const FlowContainer = React.forwardRef<HTMLElement, Omit<ElegantContainerProps, 'variant'> & { flow?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }>(
  ({ flow = 'md', ...props }, ref) => (
    <ElegantContainer 
      ref={ref} 
      variant="component" 
      flow={flow} 
      {...props} 
    />
  )
)
FlowContainer.displayName = 'FlowContainer'

export { 
  ElegantContainer,
  Section,
  Container,
  CardContainer,
  FormContainer,
  FlowContainer
}
export type { ElegantContainerProps }
