import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutBinance } from '@/components/payment-orders/CheckoutBinance';

const getSession = jest.fn();
const channel = {
  on: jest.fn(),
  subscribe: jest.fn(),
};
const removeChannel = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getSession },
    channel: jest.fn(() => channel),
    removeChannel,
  })),
}));

describe('CheckoutBinance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });

    channel.on.mockImplementation((...args) => {
      (channel.on as any).lastHandler = args[2];
      (channel.on as any).lastFilter = args[1];
      return channel;
    });
    channel.subscribe.mockImplementation(
      (callback?: (status: string) => void) => {
        (channel.subscribe as any).lastCallback = callback;
        return channel;
      }
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'order-1',
          userId: 'user-1',
          serviceName: 'Netflix',
          amount: '24.90',
          senderReference: 'REF-001',
          status: 'pending',
          createdAt: '2026-04-01T00:00:00.000Z',
        },
      }),
    }) as any;
  });

  it('disables confirm until a sender reference is present', () => {
    render(<CheckoutBinance amount="24.90" serviceName="Netflix" />);

    expect(
      screen.getByRole('button', { name: /confirmar pago/i })
    ).toBeDisabled();
  });

  it('creates the order, preserves the raw sender reference, and refetches after subscribing', async () => {
    const user = userEvent.setup();
    const onPaid = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'order-1',
            userId: 'user-1',
            serviceName: 'Netflix',
            amount: '24.90',
            senderReference: ' REF-001 ',
            status: 'pending',
            createdAt: '2026-04-01T00:00:00.000Z',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'order-1',
            userId: 'user-1',
            serviceName: 'Netflix',
            amount: '24.90',
            senderReference: ' REF-001 ',
            status: 'paid',
            createdAt: '2026-04-01T00:00:00.000Z',
          },
        }),
      });

    render(
      <CheckoutBinance amount="24.90" serviceName="Netflix" onPaid={onPaid} />
    );

    await user.type(
      screen.getByLabelText(/referencia del remitente/i),
      ' REF-001 '
    );
    const confirmButton = screen.getByRole('button', {
      name: /confirmar pago/i,
    });

    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
      body: JSON.stringify({
        serviceName: 'Netflix',
        amount: '24.90',
        senderReference: ' REF-001 ',
      }),
    });

    expect(await screen.findByText(/verificando pago/i)).toBeInTheDocument();
    expect((channel.on as any).lastFilter).toMatchObject({
      event: 'UPDATE',
      table: 'orders',
      filter: 'id=eq.order-1',
    });

    await act(async () => {
      await (channel.subscribe as any).lastCallback?.('SUBSCRIBED');
    });

    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/orders/order-1', {
      headers: {
        Authorization: 'Bearer token-123',
      },
    });

    expect(await screen.findByText(/pago confirmado/i)).toBeInTheDocument();
    expect(onPaid).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1', status: 'paid' })
    );
  });

  it('does not transition to success when realtime updates stay outside paid', async () => {
    const user = userEvent.setup();
    const onPaid = jest.fn();

    render(
      <CheckoutBinance amount="24.90" serviceName="Netflix" onPaid={onPaid} />
    );

    await user.type(
      screen.getByLabelText(/referencia del remitente/i),
      'REF-002'
    );
    await user.click(screen.getByRole('button', { name: /confirmar pago/i }));

    await act(async () => {
      await (channel.on as any).lastHandler?.({
        new: {
          id: 'order-1',
          user_id: 'user-1',
          service_name: 'Netflix',
          amount: '24.90',
          sender_reference: 'REF-002',
          status: 'pending',
          created_at: '2026-04-01T00:00:00.000Z',
        },
      });
    });

    expect(screen.getByText(/verificando pago/i)).toBeInTheDocument();
    expect(screen.queryByText(/pago confirmado/i)).not.toBeInTheDocument();
    expect(onPaid).not.toHaveBeenCalled();
  });

  it('falls back to an order snapshot when realtime subscription fails', async () => {
    const user = userEvent.setup();
    const onPaid = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'order-1',
            userId: 'user-1',
            serviceName: 'Netflix',
            amount: '24.90',
            senderReference: 'REF-003',
            status: 'pending',
            createdAt: '2026-04-01T00:00:00.000Z',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'order-1',
            userId: 'user-1',
            serviceName: 'Netflix',
            amount: '24.90',
            senderReference: 'REF-003',
            status: 'paid',
            createdAt: '2026-04-01T00:00:00.000Z',
          },
        }),
      });

    render(
      <CheckoutBinance amount="24.90" serviceName="Netflix" onPaid={onPaid} />
    );

    await user.type(
      screen.getByLabelText(/referencia del remitente/i),
      'REF-003'
    );
    await user.click(screen.getByRole('button', { name: /confirmar pago/i }));

    await act(async () => {
      await (channel.subscribe as any).lastCallback?.('CHANNEL_ERROR');
    });

    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/orders/order-1', {
      headers: {
        Authorization: 'Bearer token-123',
      },
    });
    expect(await screen.findByText(/pago confirmado/i)).toBeInTheDocument();
    expect(onPaid).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1', status: 'paid' })
    );
  });
});
