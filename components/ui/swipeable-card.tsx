'use client';

import { motion, PanInfo } from 'framer-motion';
import {
  useState,
  useCallback,
  ReactNode,
  memo,
  KeyboardEvent,
  useRef,
} from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const DRAG_INTENT_THRESHOLD_PX = 8;
const POST_DRAG_CLICK_SUPPRESSION_MS = 180;
const ACTION_GAP_PX = 4;
const ACTION_TRAY_RIGHT_PADDING_PX = 4;
const MIN_ACTION_WIDTH_PX = 70;
const MIN_ACTION_TOUCH_TARGET_PX = 44;

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
  contentClassName?: string;
  onClick?: () => void;
  disableSwipe?: boolean;
  showSwipeHint?: boolean;
  swipeHintClassName?: string;
}

const colorClasses = {
  blue: 'bg-black/90 border border-white/20 hover:bg-black active:bg-black/70',
  amber: 'bg-black/90 border border-white/20 hover:bg-black active:bg-black/70',
  red: 'bg-black/90 border border-white/20 hover:bg-black active:bg-black/70',
  green: 'bg-black/90 border border-white/20 hover:bg-black active:bg-black/70',
  gray: 'bg-black/90 border border-white/20 hover:bg-black active:bg-black/70',
};

function SwipeableCardComponent({
  children,
  actions,
  threshold = 80,
  actionWidth = 70,
  className,
  contentClassName,
  onClick,
  disableSwipe = false,
  showSwipeHint = true,
  swipeHintClassName,
}: SwipeableCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragIntentRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  const handleDrag = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (Math.abs(info.offset.x) >= DRAG_INTENT_THRESHOLD_PX) {
        dragIntentRef.current = true;
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);

      if (dragIntentRef.current) {
        suppressClickUntilRef.current =
          Date.now() + POST_DRAG_CLICK_SUPPRESSION_MS;
      }

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
    dragIntentRef.current = false;
    suppressClickUntilRef.current = 0;
  }, []);

  const handleCardClick = useCallback(() => {
    if (isRevealed) {
      setIsRevealed(false);
      return;
    }

    if (!onClick || isDragging) {
      return;
    }

    if (Date.now() < suppressClickUntilRef.current) {
      return;
    }

    if (onClick) {
      onClick();
    }
  }, [isRevealed, onClick, isDragging]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();

        if (isRevealed) {
          setIsRevealed(false);
          return;
        }

        onClick();
      }
    },
    [isRevealed, onClick]
  );

  const handleAction = useCallback((action: () => void) => {
    setIsRevealed(false);
    action();
  }, []);

  const resolvedActionWidth = Math.max(actionWidth, MIN_ACTION_WIDTH_PX);
  const maxDrag =
    actions.length === 0
      ? 0
      : -(
          resolvedActionWidth * actions.length +
          ACTION_GAP_PX * (actions.length - 1) +
          ACTION_TRAY_RIGHT_PADDING_PX
        );

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Action buttons revealed on swipe */}
      <motion.div
        className={cn(
          'absolute bottom-0 right-0 top-0 z-0 flex h-full items-stretch py-1 transition-opacity duration-200',
          isRevealed || isDragging
            ? 'opacity-100'
            : 'pointer-events-none opacity-0'
        )}
        style={{
          gap: ACTION_GAP_PX,
          paddingRight: ACTION_TRAY_RIGHT_PADDING_PX,
        }}
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
              'z-10 flex flex-col items-center justify-center rounded-xl px-4 text-white shadow-lg transition-colors duration-150',
              colorClasses[action.color]
            )}
            style={{
              width: resolvedActionWidth,
              flex: '0 0 auto',
              minHeight: MIN_ACTION_TOUCH_TARGET_PX,
            }}
            whileTap={{ scale: 0.92 }}
            aria-label={action.label}
          >
            <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              {action.icon}
            </div>
            <span className="text-[11px] font-semibold tracking-wide">
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Main card content - draggable */}
      <motion.div
        className={cn(
          'relative z-10 touch-pan-y',
          contentClassName || 'bg-background',
          onClick && 'focus-ring cursor-pointer'
        )}
        drag={disableSwipe ? false : 'x'}
        dragConstraints={{ left: maxDrag, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: isRevealed ? maxDrag : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        onClick={handleCardClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={handleKeyDown}
      >
        {children}

        {/* Swipe hint indicator - visible only on mobile when not revealed */}
        {!isRevealed && !disableSwipe && showSwipeHint && (
          <motion.div
            className={cn(
              'pointer-events-none absolute bottom-1/2 right-4 flex translate-y-1/2 items-center space-x-1 text-xs text-muted-foreground/40 sm:hidden',
              swipeHintClassName
            )}
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
