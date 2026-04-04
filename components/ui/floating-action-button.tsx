'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useState, useEffect, ReactNode } from 'react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
  /** Solo mostrar en mobile */
  mobileOnly?: boolean;
  /** Posición del FAB */
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  /** Mostrar label expandido */
  extended?: boolean;
  /** Color del FAB */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  /** Ocultar cuando el scroll está arriba */
  hideOnScrollTop?: boolean;
  className?: string;
}

const positionClasses = {
  'bottom-right': 'right-4 sm:right-6 bottom-[120px] sm:bottom-6 mb-safe-bottom',
  'bottom-center':
    'left-1/2 transform -translate-x-1/2 bottom-[120px] sm:bottom-6 mb-safe-bottom',
  'bottom-left': 'left-4 sm:left-6 bottom-[120px] sm:bottom-6 mb-safe-bottom',
};

const variantClasses = {
  primary:
    'bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary shadow-primary/30',
  secondary: 'bg-muted hover:bg-muted/80 text-foreground shadow-muted/30',
  success:
    'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 shadow-green-500/30',
  warning:
    'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-500 shadow-amber-500/30',
  danger:
    'bg-gradient-to-r from-red-500 to-rose-600 hover:from-rose-600 hover:to-red-500 shadow-red-500/30',
};

export function FloatingActionButton({
  onClick,
  icon = <Plus className="h-6 w-6" />,
  label = 'Nuevo',
  mobileOnly = true,
  position = 'bottom-right',
  extended = false,
  variant = 'primary',
  hideOnScrollTop = false,
  className = '',
}: FloatingActionButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll visibility
  useEffect(() => {
    if (!hideOnScrollTop) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScrollTop]);

  // Don't render on desktop if mobileOnly
  if (mobileOnly && !isMobile) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`fixed z-50 ${positionClasses[position]} ${extended ? 'rounded-full px-5 py-4' : 'rounded-full p-4'} ${variantClasses[variant]} font-medium text-white shadow-xl transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 active:shadow-lg ${className} `}
          aria-label={label}
        >
          <motion.div className="flex items-center space-x-2" layout>
            <motion.div
              animate={{ rotate: isHovered ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>

            <AnimatePresence mode="wait">
              {(extended || isHovered) && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap text-sm font-semibold"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Pulse ring effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white/20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
