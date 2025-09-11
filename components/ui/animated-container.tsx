'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideInUp';
  delay?: number;
  duration?: number;
  stagger?: boolean;
  staggerDelay?: number;
  threshold?: number;
  once?: boolean;
}

const AnimatedContainer = React.forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ 
    className, 
    children, 
    animation = 'fadeInUp',
    delay = 0,
    duration = 500,
    stagger = false,
    staggerDelay = 100,
    threshold = 0.1,
    once = true,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Memoized intersection observer callback
    const intersectionCallback = useCallback(([entry]: IntersectionObserverEntry[]) => {
      if (entry.isIntersecting && (!once || !hasAnimated)) {
        setIsVisible(true);
        if (once) {
          setHasAnimated(true);
        }
      } else if (!once && !entry.isIntersecting) {
        setIsVisible(false);
      }
    }, [once, hasAnimated]);

    // Memoized observer options
    const observerOptions = useMemo(() => ({
      threshold,
      rootMargin: '50px'
    }), [threshold]);

    useEffect(() => {
      const observer = new IntersectionObserver(intersectionCallback, observerOptions);

      const currentRef = containerRef.current;
      if (currentRef) {
        observer.observe(currentRef);
      }

      return () => {
        if (currentRef) {
          observer.unobserve(currentRef);
        }
      };
    }, [intersectionCallback, observerOptions]);

    // Memoized animation classes
    const animationClasses = useMemo(() => ({
      fadeInUp: 'animate-fade-in-up',
      fadeInDown: 'animate-fade-in-down',
      fadeInLeft: 'animate-fade-in-left',
      fadeInRight: 'animate-fade-in-right',
      scaleIn: 'animate-scale-in',
      slideInUp: 'animate-slide-in-up'
    }), []);

    // Memoized staggered children
    const staggeredChildren = useMemo(() => {
      if (!stagger || !React.Children.count(children)) {
        return children;
      }

      return React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const staggerClass = `stagger-${Math.min(index + 1, 6)}`;
          return React.cloneElement(child, {
            className: cn(
              child.props.className,
              isVisible && animationClasses[animation],
              isVisible && staggerClass
            ),
            style: {
              ...child.props.style,
              animationDelay: `${delay + (index * staggerDelay)}ms`,
              animationDuration: `${duration}ms`,
              animationFillMode: 'both'
            }
          });
        }
        return child;
      });
    }, [stagger, children, isVisible, animationClasses, animation, delay, staggerDelay, duration]);

    // Memoized container styles
    const containerStyles = useMemo(() => ({
      animationDelay: !stagger ? `${delay}ms` : undefined,
      animationDuration: !stagger ? `${duration}ms` : undefined,
      animationFillMode: !stagger ? 'both' : undefined
    }), [stagger, delay, duration]);

    return (
      <div
        ref={(node) => {
          // Assign to our internal ref
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          // Forward to the external ref
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        className={cn(
          !stagger && isVisible && animationClasses[animation],
          className
        )}
        style={containerStyles}
        {...props}
      >
        {stagger ? staggeredChildren : children}
      </div>
    );
  }
);

AnimatedContainer.displayName = 'AnimatedContainer';

export { AnimatedContainer };
export type { AnimatedContainerProps };