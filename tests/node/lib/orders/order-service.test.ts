import { createOrder, validateExactAmount } from '@/lib/orders/order-service';
import { createServerOrdersRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/admin', () => ({
  createServiceClient: jest.fn(() => ({})),
}));

jest.mock('@/repositories/factory', () => ({
  createServerOrdersRepository: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('order service', () => {
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    listByUserId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerOrdersRepository as jest.Mock).mockReturnValue(repository);
  });

  it('preserves the exact amount string and sender reference when creating orders', async () => {
    repository.create.mockResolvedValue({ id: 'order-1', amount: '24.90' });

    await createOrder('user-1', {
      serviceName: 'Netflix Premium',
      amount: '24.90',
      senderReference: ' REF-001 ',
    });

    expect(repository.create).toHaveBeenCalledWith('user-1', {
      serviceName: 'Netflix Premium',
      amount: '24.90',
      senderReference: ' REF-001 ',
    });
  });

  it('rejects malformed exact amount values', () => {
    expect(() => validateExactAmount(' 24.90')).toThrow(
      'amount must not contain leading or trailing spaces'
    );
    expect(() => validateExactAmount('24,90')).toThrow(
      'amount must be a numeric string'
    );
    expect(() => validateExactAmount('0.00')).toThrow(
      'amount must be greater than 0'
    );
  });
});
