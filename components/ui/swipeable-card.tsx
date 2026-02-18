'use client';

import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
  AnimatePresence,
} from 'framer-motion';
import {
  useState,
  useRef,
  useCallback,
  ReactNode,
  memo,
  KeyboardEvent,
} from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  color: 'blue' | 'amber' | 'red' | 'green' | 'gray';
}

interface SwipeableCardProps {
  children: ReactNode;
  actions: SwipeAction[];
  threshold?: number;
  actionWidth?: number;
  className?: string;
  onClick?: () => void;
  disableSwipe?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
  amber: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
  red: 'bg-red-500 hover:bg-red-600 active:bg-red-700',
  green: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
  gray: 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700',
};

function SwipeableCardComponent({
  children,
  actions,
  threshold = 80,
  actionWidth = 70,
  className,
  onClick,
  disableSwipe = false,
}: SwipeableCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);

  const x = useMotionValue(0);
  const actionsOpacity = useTransform(
    x,
    [-threshold * 2, -threshold, 0],
    [1, 0.8, 0]
  );
  const actionsScale = useTransform(
    x,
    [-threshold * 2, -threshold, 0],
    [1, 0.9, 0.8]
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);

      if (info.offset.x < -threshold) {
        setIsRevealed(true);
      } else if (info.offset.x > threshold / 2) {
        setIsRevealed(false);
      }
    },
    [threshold]
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleCardClick = useCallback(() => {
    if (isRevealed) {
      setIsRevealed(false);
    } else if (onClick && !isDragging) {
      onClick();
    }
  }, [isRevealed, onClick, isDragging]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick, onClick]
  );

  const handleAction = useCallback((action: () => void) => {
    setIsRevealed(false);
    action();
  }, []);

  const maxDrag = -(actionWidth * actions.length);

  return (
    <div
      className={cn(
        'relative overflow-hidden will-change-transform',
        className
      )}
    >
      {/* Action buttons revealed on swipe */}
      <motion.div
        className="absolute bottom-0 right-0 top-0 z-0 flex h-full items-stretch"
        style={{ opacity: actionsOpacity, scale: actionsScale }}
      >
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(action.onClick);
            }}
            className={cn(
              'z-10 flex flex-col items-center justify-center px-4 text-white transition-colors',
              colorClasses[action.color],
              `min-w-[${actionWidth}px]`
            )}
            style={{ minWidth: actionWidth }}
            whileTap={{ scale: 0.95 }}
            aria-label={action.label}
          >
            {action.icon}
            <span className="mt-1 text-xs font-medium">{action.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Main card content - draggable */}
      <motion.div
        className={cn(
          'relative z-10 touch-pan-y bg-background',
          onClick && 'focus-ring cursor-pointer'
        )}
        drag={disableSwipe ? false : 'x'}
        dragConstraints={{ left: maxDrag, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ x: isRevealed ? maxDrag : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        onClick={handleCardClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={handleKeyDown}
        whileDrag={{
          scale: 1.02,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
      >
        {children}

        {/* Swipe hint indicator - visible only on mobile when not revealed */}
        {!isRevealed && !disableSwipe && (
          <motion.div
            className="pointer-events-none absolute bottom-1/2 right-4 flex translate-y-1/2 items-center space-x-1 text-xs text-muted-foreground/40 sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <ArrowRight className="h-3 w-3 animate-pulse" />
            <span>Desliza</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export const SwipeableCard = memo(SwipeableCardComponent);
