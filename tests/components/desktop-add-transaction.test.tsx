import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DesktopAddTransaction } from '@/components/transactions/desktop-add-transaction';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';

const mockPush = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

const mockRepository = {
  categories: {
    findAll: jest.fn().mockResolvedValue([]),
  },
  accounts: {
    findByUserId: jest.fn().mockResolvedValue([]),
  },
};

jest.mock('@/providers', () => ({
  useRepository: () => mockRepository,
}));

jest.mock('@/providers/repository-provider', () => ({
  useRepository: () => mockRepository,
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

jest.mock('@/hooks', () => ({
  useModal: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}));

jest.mock('@/lib/store', () => ({
  useNotifications: () => ({
    addNotification: jest.fn(),
  }),
  useAppStore: (selector: any) => selector({ selectedRateSource: 'bcv' }),
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 40,
}));

jest.mock('@/lib/hotkeys', () => ({
  useFormShortcuts: jest.fn(),
}));

jest.mock('@/components/forms/category-form', () => ({
  CategoryForm: () => <div data-testid="category-form" />,
}));

describe('DesktopAddTransaction recurring pre-selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with isRecurring as true when query param recurring=true is present', async () => {
    mockGet.mockReturnValueOnce('true');
    render(<DesktopAddTransaction />);

    const checkbox = await screen.findByLabelText(/Transacción Recurrente/i);
    expect(checkbox).toBeChecked();
  });

  it('renders with isRecurring as false when query param recurring is not true', async () => {
    mockGet.mockReturnValueOnce(null);
    render(<DesktopAddTransaction />);

    const checkbox = await screen.findByLabelText(/Transacción Recurrente/i);
    expect(checkbox).not.toBeChecked();
  });
});
