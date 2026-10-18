'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Coffee, Car } from 'lucide-react';
import { SwipeableCard } from '@/components/ui/swipeable-card';

export function TransactionSwipeHarness() {
  const [log, setLog] = useState<string>('idle');
  const [clickCount, setClickCount] = useState<number>(0);
  const [editCount, setEditCount] = useState<number>(0);
  const [deleteCount, setDeleteCount] = useState<number>(0);

  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <header className="mb-4">
        <h1 className="text-base font-bold">Swipe Harness</h1>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span data-testid="status-log">Status: {log}</span>
          <span data-testid="click-count">Clicks: {clickCount}</span>
          <span data-testid="edit-count">Edits: {editCount}</span>
          <span data-testid="delete-count">Deletes: {deleteCount}</span>
        </div>
      </header>

      <main className="space-y-3" data-testid="swipe-container">
        {/* Row 1 */}
        <div data-testid="swipe-row-1">
          <SwipeableCard
            actions={[
              {
                label: 'Editar',
                icon: <Pencil className="h-5 w-5" />,
                color: 'blue',
                onClick: () => {
                  setLog('edit-row-1');
                  setEditCount((c) => c + 1);
                },
              },
              {
                label: 'Eliminar',
                icon: <Trash2 className="h-5 w-5" />,
                color: 'red',
                onClick: () => {
                  setLog('delete-row-1');
                  setDeleteCount((c) => c + 1);
                },
              },
            ]}
            onClick={() => {
              setLog('click-row-1');
              setClickCount((c) => c + 1);
            }}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Coffee className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Café Juan Valdez
                  </p>
                  <p className="text-xs text-muted-foreground">
                    2026-10-17 · Efectivo
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-rose-500">-$4.50</p>
                <p className="text-[11px] text-muted-foreground">USD</p>
              </div>
            </div>
          </SwipeableCard>
        </div>

        {/* Row 2 */}
        <div data-testid="swipe-row-2">
          <SwipeableCard
            actions={[
              {
                label: 'Editar',
                icon: <Pencil className="h-5 w-5" />,
                color: 'blue',
                onClick: () => {
                  setLog('edit-row-2');
                  setEditCount((c) => c + 1);
                },
              },
              {
                label: 'Eliminar',
                icon: <Trash2 className="h-5 w-5" />,
                color: 'red',
                onClick: () => {
                  setLog('delete-row-2');
                  setDeleteCount((c) => c + 1);
                },
              },
            ]}
            onClick={() => {
              setLog('click-row-2');
              setClickCount((c) => c + 1);
            }}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Yummy Rides</p>
                  <p className="text-xs text-muted-foreground">
                    2026-10-17 · Pago Móvil
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-rose-500">-$12.00</p>
                <p className="text-[11px] text-muted-foreground">USD</p>
              </div>
            </div>
          </SwipeableCard>
        </div>
      </main>
    </div>
  );
}
