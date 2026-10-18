import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceCaptureModal } from '@/components/bulk-capture/voice-capture-modal';
import { today } from '@/components/bulk-capture/capture-controls';
import type { Account, Transaction } from '@/types/domain';
const mockCreate = jest.fn();
const mockRepository = { transactions: { create: mockCreate } };
jest.mock('@/providers', () => ({ useRepository: () => mockRepository }));
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user' } }),
}));
jest.mock('@/lib/rates', () => ({ useActiveUsdVesRate: () => 100 }));
jest.mock('@/lib/finance/financial-data-sync', () => ({
  runFinancialMutation: ({ mutation }: { mutation: () => Promise<unknown> }) =>
    mutation(),
}));
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));
jest.mock('@/components/ui', () => ({
  Modal: ({
    children,
    footer,
  }: {
    children: React.ReactNode;
    footer: React.ReactNode;
  }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));
jest.mock('@/hooks/use-receipt-scanner', () => ({
  compressImage: jest.fn(async () => 'data:image/jpeg;base64,AAAA'),
}));
const account = {
  id: 'account',
  name: 'Efectivo',
  currencyCode: 'USD',
} as Account;
const movement = {
  date: '2026-01-01',
  dateInferred: false,
  amount: 2.35,
  currency: 'VES',
  type: 'EXPENSE',
  description: 'Café',
  categoryId: null,
  accountId: 'account',
  sourceImage: null,
  confidence: 1,
};
const base = {
  isOpen: true,
  onClose: jest.fn(),
  accounts: [account],
  categories: [],
  existingTransactions: [] as Transaction[],
};
const mockFetch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({});
  global.fetch = mockFetch;
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: [movement] }),
  });
});
async function analyze() {
  fireEvent.change(screen.getByLabelText('Capturas (máximo 10)'), {
    target: {
      files: [new File(['image'], 'capture.png', { type: 'image/png' })],
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analizar' }));
  await screen.findByLabelText('Seleccionar movimiento 1');
}
it('disables analysis without an image', () => {
  render(<VoiceCaptureModal {...base} />);
  expect(screen.getByRole('button', { name: 'Analizar' })).toBeDisabled();
});
it('leaves history duplicates unchecked and saves only reviewed rows in account minor units', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [movement, { ...movement, amount: 5, description: 'Duplicado' }],
    }),
  });
  render(
    <VoiceCaptureModal
      {...base}
      existingTransactions={[
        {
          accountId: 'account',
          date: movement.date,
          amountMinor: 500,
          currencyCode: 'USD',
        } as Transaction,
      ]}
    />
  );
  await analyze();
  expect(screen.getByLabelText('Seleccionar movimiento 2')).not.toBeChecked();
  fireEvent.click(
    screen.getByRole('button', { name: 'Guardar 1 movimientos' })
  );
  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      amountMinor: 235,
      currencyCode: 'USD',
      tags: ['captura-voz'],
    })
  );
});
it('uploads compressed screenshots', async () => {
  render(<VoiceCaptureModal {...base} />);
  await analyze();
  const form = mockFetch.mock.calls[0][1].body as FormData;
  const [uploaded] = form.getAll('images') as File[];
  expect(uploaded.type).toBe('image/jpeg');
  expect(uploaded.size).toBe(3);
});
it('warns when the screenshot currency differs from the chosen account', async () => {
  render(<VoiceCaptureModal {...base} />);
  await analyze();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'La captura está en VES y la cuenta en USD'
  );
});
it('does not warn when currencies match', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [{ ...movement, currency: 'USD' }],
    }),
  });
  render(<VoiceCaptureModal {...base} />);
  await analyze();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('does not let a dust amount that rounds to zero abort the batch', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        { ...movement, currency: 'USD', amount: 0.0004, description: 'Dust' },
        { ...movement, currency: 'USD', amount: 5 },
      ],
    }),
  });
  render(<VoiceCaptureModal {...base} />);
  await analyze();
  fireEvent.click(
    screen.getByRole('button', { name: 'Guardar 1 movimientos' })
  );
  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ amountMinor: 500 })
  );
});
it('flags a future date as a probable misread year', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        { ...movement, currency: 'USD', date: '2999-01-01' },
        { ...movement, currency: 'USD', description: 'Normal' },
      ],
    }),
  });
  render(<VoiceCaptureModal {...base} />);
  await analyze();
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(screen.getByRole('alert')).toHaveTextContent('Fecha futura');
});
it('does not flag today as a future date', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [{ ...movement, currency: 'USD', date: today() }],
    }),
  });
  render(<VoiceCaptureModal {...base} />);
  await analyze();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('shows the currency warning even when the date is also in the future', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [{ ...movement, currency: 'VES', date: '2999-01-01' }],
    }),
  });
  render(<VoiceCaptureModal {...base} />);
  await analyze();
  const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
  expect(alerts).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Fecha futura'),
      expect.stringContaining('La captura está en VES y la cuenta en USD'),
    ])
  );
});
it('excludes rows without an account from saving', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [{ ...movement, accountId: null }],
    }),
  });
  render(<VoiceCaptureModal {...base} />);
  await analyze();
  expect(
    screen.getByRole('button', { name: 'Guardar 0 movimientos' })
  ).toBeDisabled();
  expect(mockCreate).not.toHaveBeenCalled();
});
it('shows the API error without saving', async () => {
  mockFetch.mockResolvedValue({
    ok: false,
    json: async () => ({ success: false, error: 'Límite alcanzado' }),
  });
  render(<VoiceCaptureModal {...base} />);
  fireEvent.change(screen.getByLabelText('Capturas (máximo 10)'), {
    target: { files: [new File(['x'], 'x.png', { type: 'image/png' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analizar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Límite alcanzado'
  );
  expect(mockCreate).not.toHaveBeenCalled();
});
it('keeps audio upload available after microphone permission rejection', async () => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn().mockRejectedValue(new Error('denied')) },
  });
  Object.defineProperty(global, 'MediaRecorder', {
    configurable: true,
    value: jest.fn(),
  });
  render(<VoiceCaptureModal {...base} />);
  fireEvent.click(screen.getByRole('button', { name: 'Grabar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No se pudo acceder al micrófono'
  );
  const upload = screen.getByLabelText('Subir audio');
  expect(upload).toBeEnabled();
  fireEvent.change(upload, {
    target: { files: [new File(['audio'], 'nota.ogg', { type: 'audio/ogg' })] },
  });
  expect(
    await screen.findByRole('button', { name: 'Descartar audio' })
  ).toBeInTheDocument();
});
