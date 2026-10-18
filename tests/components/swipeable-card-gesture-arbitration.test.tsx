import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  SwipeableCard,
  type SwipeAction,
} from '@/components/ui/swipeable-card';

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
      const dragStartYRef = React.useRef(null);
      const canDrag = drag && drag !== false;

      const triggerDragStart = (event: any) => {
        if (!canDrag) return;
        dragStartXRef.current = event.clientX;
        dragStartYRef.current = event.clientY;
        onDragStart?.(event, { offset: { x: 0, y: 0 } });
      };

      const triggerDragMove = (event: any) => {
        if (
          !canDrag ||
          dragStartXRef.current === null ||
          dragStartYRef.current === null
        )
          return;
        onDrag?.(event, {
          offset: {
            x: event.clientX - dragStartXRef.current,
            y: event.clientY - dragStartYRef.current,
          },
        });
      };

      const triggerDragEnd = (event: any) => {
        if (
          !canDrag ||
          dragStartXRef.current === null ||
          dragStartYRef.current === null
        )
          return;
        onDragEnd?.(event, {
          offset: {
            x: event.clientX - dragStartXRef.current,
            y: event.clientY - dragStartYRef.current,
          },
        });
        dragStartXRef.current = null;
        dragStartYRef.current = null;
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

function createTwoActions(prefix = ''): {
  actions: SwipeAction[];
  onEdit: jest.Mock;
  onDelete: jest.Mock;
} {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const suffix = prefix ? ` ${prefix}` : '';

  return {
    actions: [
      {
        label: `Editar${suffix}`,
        icon: <span>edit</span>,
        onClick: onEdit,
        color: 'amber',
      },
      {
        label: `Eliminar${suffix}`,
        icon: <span>delete</span>,
        onClick: onDelete,
        color: 'red',
      },
    ],
    onEdit,
    onDelete,
  };
}

function renderSwipeableCard(options?: {
  onClick?: jest.Mock;
  showSwipeHint?: boolean;
  actions?: SwipeAction[];
}) {
  const onClick = options?.onClick ?? jest.fn();
  const actions = options?.actions ?? [
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

function dragCard(
  card: HTMLElement,
  startX: number,
  endX: number,
  startY = 20,
  endY = startY
) {
  fireEvent.mouseDown(card, { clientX: startX, clientY: startY });
  fireEvent.mouseMove(card, { clientX: endX, clientY: endY });
  fireEvent.mouseUp(card, { clientX: endX, clientY: endY });
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

  it('does not reveal actions for vertical scroll with minor horizontal jitter', () => {
    const onClick = jest.fn();
    const { card } = renderSwipeableCard({ onClick });

    fireEvent.mouseDown(card, { clientX: 220, clientY: 60 });
    fireEvent.mouseMove(card, { clientX: 214, clientY: 210 });
    fireEvent.mouseUp(card, { clientX: 213, clientY: 280 });

    expect(card).toHaveAttribute('data-motion-x', '0');

    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reveals equal-width actions including tray padding and dispatches each callback', () => {
    const { actions, onEdit, onDelete } = createTwoActions();
    const onClick = jest.fn();
    const { card } = renderSwipeableCard({ actions, onClick });

    dragCard(card, 260, 150);

    expect(card).toHaveAttribute('data-motion-x', '-148');
    const editButton = screen.getByRole('button', { name: 'Editar' });
    const deleteButton = screen.getByRole('button', { name: 'Eliminar' });
    expect(editButton).toHaveStyle({ width: '70px', minHeight: '44px' });
    expect(deleteButton).toHaveStyle({ width: '70px', minHeight: '44px' });

    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    expect(card).toHaveAttribute('data-motion-x', '0');

    dragCard(card, 260, 150);
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(card).toHaveAttribute('data-motion-x', '0');
  });

  it('settles partial, fast, and repeated opening and closing drags', () => {
    const { actions } = createTwoActions();
    const { card } = renderSwipeableCard({ actions });

    dragCard(card, 240, 200);
    expect(card).toHaveAttribute('data-motion-x', '0');

    dragCard(card, 240, 20);
    expect(card).toHaveAttribute('data-motion-x', '-148');

    dragCard(card, 240, 130);
    expect(card).toHaveAttribute('data-motion-x', '-148');

    dragCard(card, 130, 150);
    expect(card).toHaveAttribute('data-motion-x', '-148');

    dragCard(card, 130, 180);
    expect(card).toHaveAttribute('data-motion-x', '0');

    dragCard(card, 130, 230);
    expect(card).toHaveAttribute('data-motion-x', '0');

    dragCard(card, 240, 160);
    expect(card).toHaveAttribute('data-motion-x', '0');
  });

  it('keeps open state and action callbacks independent between rows', () => {
    const first = createTwoActions('fila A');
    const second = createTwoActions('fila B');
    const firstOnClick = jest.fn();
    const secondOnClick = jest.fn();

    render(
      <>
        <SwipeableCard actions={first.actions} onClick={firstOnClick}>
          <div>Fila A</div>
        </SwipeableCard>
        <SwipeableCard actions={second.actions} onClick={secondOnClick}>
          <div>Fila B</div>
        </SwipeableCard>
      </>
    );

    const firstCard = screen.getByText('Fila A').closest('[role="button"]')!;
    const secondCard = screen.getByText('Fila B').closest('[role="button"]')!;

    dragCard(firstCard, 260, 150);
    expect(firstCard).toHaveAttribute('data-motion-x', '-148');
    expect(secondCard).toHaveAttribute('data-motion-x', '0');

    dragCard(secondCard, 260, 150);
    expect(firstCard).toHaveAttribute('data-motion-x', '-148');
    expect(secondCard).toHaveAttribute('data-motion-x', '-148');

    fireEvent.click(screen.getByRole('button', { name: 'Editar fila A' }));
    expect(firstCard).toHaveAttribute('data-motion-x', '0');
    expect(secondCard).toHaveAttribute('data-motion-x', '-148');
    expect(first.onEdit).toHaveBeenCalledTimes(1);
    expect(second.onEdit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar fila B' }));
    expect(secondCard).toHaveAttribute('data-motion-x', '0');
    expect(second.onDelete).toHaveBeenCalledTimes(1);
    expect(firstOnClick).not.toHaveBeenCalled();
    expect(secondOnClick).not.toHaveBeenCalled();
  });

  it('closes revealed row on tap without firing navigation callback', () => {
    const onClick = jest.fn();
    const { card } = renderSwipeableCard({ onClick });

    fireEvent.mouseDown(card, { clientX: 260, clientY: 20 });
    fireEvent.mouseMove(card, { clientX: 150, clientY: 20 });
    fireEvent.mouseUp(card, { clientX: 120, clientY: 20 });

    expect(card).toHaveAttribute('data-motion-x', '-74');

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
