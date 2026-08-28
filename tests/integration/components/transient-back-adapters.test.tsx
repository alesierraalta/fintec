import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Modal } from '@/components/ui/modal';
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';
import { MobileMenuToggle } from '@/app/(public)/components/mobile-menu';
import { MobileMenuFAB } from '@/components/layout/mobile-menu-fab';
import { TransactionDetailPanel } from '@/components/transactions/transaction-detail-panel';
import type { TransientBackEntry } from '@/lib/navigation/transient-back-registry';

const registerBack = jest.fn<(entry: TransientBackEntry) => () => void>(() => jest.fn());
const useSidebar = jest.fn(() => ({ isMobile: true }));
const useSubscription = jest.fn(() => ({
  isFree: false,
  isOwnerAdmin: false,
  loading: false,
  error: null,
}));

jest.mock('@/components/providers/native-back-navigation', () => ({
  useNativeBackNavigation: () => registerBack,
}));
jest.mock('@/contexts/sidebar-context', () => ({ useSidebar: () => useSidebar() }));
jest.mock('@/hooks/use-subscription', () => ({ useSubscription: () => useSubscription() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/hooks/use-historical-rates', () => ({
  useHistoricalRates: () => ({ vesRates: { dateLabel: 'hoy' } }),
}));

const transaction = {
  id: 'transaction-1',
  amountMinor: 1250,
  currencyCode: 'USD',
  type: 'EXPENSE',
  date: '2026-01-01',
  note: '',
  tags: [],
} as any;

function expectRegistration(priority: number, id: string) {
  expect(registerBack).toHaveBeenCalledWith(
    expect.objectContaining({ id: expect.stringMatching(id), priority, close: expect.any(Function) })
  );
}

describe('transient back adapters', () => {
  beforeEach(() => {
    registerBack.mockClear();
    useSidebar.mockReturnValue({ isMobile: true });
    document.body.innerHTML = '<div id="modal-root"></div>';
  });

  it('registers and unregisters an open modal', async () => {
    const onClose = jest.fn();
    const view = render(<Modal open onClose={onClose} title="Modal">Content</Modal>);
    await act(async () => {});

    expectRegistration(100, /^modal-/);
    view.unmount();
  });

  it('registers an open alert dialog and closes through the adapter', async () => {
    const onOpenChange = jest.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>Confirmation</AlertDialogContent>
      </AlertDialog>
    );
    await act(async () => {});

    expectRegistration(110, /^alert-dialog-/);
    const entry = registerBack.mock.calls[0][0];
    act(() => entry.close());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('registers the public mobile menu only while open', async () => {
    const view = render(<MobileMenuToggle links={[{ label: 'Inicio', href: '/' }]} />);
    expect(registerBack).not.toHaveBeenCalled();

    await act(async () => {
      await screen.getByRole('button', { name: 'Abrir menú de navegación' }).click();
    });
    expectRegistration(95, /^public-mobile-menu$/);
    view.unmount();
  });

  it('registers the mobile drawer only while open', async () => {
    render(<MobileMenuFAB />);
    await act(async () => {});
    expect(registerBack).not.toHaveBeenCalled();

    await act(async () => {
      await screen.getByRole('button', { name: 'Abrir menú' }).click();
    });
    expectRegistration(95, /^mobile-menu$/);
  });

  it('registers an open transaction detail panel', async () => {
    render(
      <TransactionDetailPanel
        transaction={transaction}
        isOpen
        onClose={jest.fn()}
        onEdit={jest.fn()}
        isMobile
        accountName="Cuenta"
        categoryName="Comida"
        formatAmount={(amount) => String(amount)}
        getCurrencySymbol={(code) => code}
      />
    );
    await act(async () => {});

    expectRegistration(105, /^transaction-detail-transaction-1$/);
  });
});
