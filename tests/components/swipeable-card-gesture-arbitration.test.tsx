import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SwipeableCard } from '@/components/ui/swipeable-card';

jest.mock('framer-motion', () => {
  const React = require('react');

  const createMotionComponent = (Tag: 'div' | 'button') =>
    React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        drag,
        onDragStart,
        onDrag,
        onDragEnd,
        onClick,
        animate,
        whileTap,
        whileDrag,
        dragConstraints,
        dragElastic,
        dragMomentum,
        initial,
        transition,
        ...domProps
      } = props;

      const dragStartXRef = React.useRef(null);
      const canDrag = drag && drag !== false;

      const triggerDragStart = (event: any) => {
        if (!canDrag) return;
        dragStartXRef.current = event.clientX;
        onDragStart?.(event, { offset: { x: 0, y: 0 } });
      };

      const triggerDragMove = (event: any) => {
        if (!canDrag || dragStartXRef.current === null) return;
        onDrag?.(event, {
          offset: { x: event.clientX - dragStartXRef.current, y: 0 },
        });
      };

      const triggerDragEnd = (event: any) => {
        if (!canDrag || dragStartXRef.current === null) return;
        onDragEnd?.(event, {
          offset: { x: event.clientX - dragStartXRef.current, y: 0 },
        });
        dragStartXRef.current = null;
      };

      return React.createElement(
        Tag,
        {
          ...domProps,
          ref,
          'data-motion-x': animate?.x,
          onPointerDown: (event: any) => {
            triggerDragStart(event);
            domProps.onPointerDown?.(event);
          },
          onPointerMove: (event: any) => {
            triggerDragMove(event);
            domProps.onPointerMove?.(event);
          },
          onPointerUp: (event: any) => {
            triggerDragEnd(event);
            domProps.onPointerUp?.(event);
          },
          onMouseDown: (event: any) => {
            triggerDragStart(event);
            domProps.onMouseDown?.(event);
          },
          onMouseMove: (event: any) => {
            triggerDragMove(event);
            domProps.onMouseMove?.(event);
          },
          onMouseUp: (event: any) => {
            triggerDragEnd(event);
            domProps.onMouseUp?.(event);
          },
          onClick: (event: any) => {
            onClick?.(event);
            domProps.onClick?.(event);
          },
        },
        children
      );
    });

  return {
    motion: {
      div: createMotionComponent('div'),
      button: createMotionComponent('button'),
    },
  };
});

function renderSwipeableCard(options?: {
  onClick?: jest.Mock;
  showSwipeHint?: boolean;
}) {
  const onClick = options?.onClick ?? jest.fn();
  const actions = [
    {
      label: 'Editar',
      icon: <span>edit</span>,
      onClick: jest.fn(),
      color: 'amber' as const,
    },
  ];

  render(
    <SwipeableCard
      actions={actions}
      onClick={onClick}
      showSwipeHint={options?.showSwipeHint}
    >
      <div>Fila de prueba</div>
    </SwipeableCard>
  );

  return {
    onClick,
    card: screen
      .getByText('Fila de prueba')
      .closest('[role="button"]') as HTMLElement,
  };
}

describe('SwipeableCard gesture arbitration', () => {
  let now = 1_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs onClick for taps without meaningful horizontal drag', () => {
    const onClick = jest.fn();
    const { card } = renderSwipeableCard({ onClick });

    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('suppresses same-gesture click after swipe-qualified drag', () => {
    const onClick = jest.fn();
    const { card } = renderSwipeableCard({ onClick });

    fireEvent.mouseDown(card, { clientX: 260, clientY: 20 });
    fireEvent.mouseMove(card, { clientX: 180, clientY: 20 });
    fireEvent.mouseUp(card, { clientX: 160, clientY: 20 });

    fireEvent.click(card);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('closes revealed row on tap without firing navigation callback', () => {
    const onClick = jest.fn();
    const { card } = renderSwipeableCard({ onClick });

    fireEvent.mouseDown(card, { clientX: 260, clientY: 20 });
    fireEvent.mouseMove(card, { clientX: 150, clientY: 20 });
    fireEvent.mouseUp(card, { clientX: 120, clientY: 20 });

    expect(card).toHaveAttribute('data-motion-x', '-70');

    now += 500;
    fireEvent.click(card);

    expect(card).toHaveAttribute('data-motion-x', '0');
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('SwipeableCard hint contract', () => {
  it('renders swipe hint by default', () => {
    renderSwipeableCard();

    expect(screen.getByText('Desliza')).toBeInTheDocument();
  });

  it('hides row-level swipe hint when showSwipeHint is false', () => {
    renderSwipeableCard({ showSwipeHint: false });

    expect(screen.queryByText('Desliza')).not.toBeInTheDocument();
  });
});
