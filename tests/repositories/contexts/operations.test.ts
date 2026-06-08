/**
 * Task 3.4: Operations Bounded Context
 *
 * Tests for OperationsContext interface and createOperationsContext factory.
 * Groups: orders, paymentOrders, recurringTransactions, transfers, notifications, approvalRequests repositories.
 */

import type { OperationsContext } from '@/repositories/contexts/operations';

// ─── Task 3.4: OperationsContext Interface Tests ──────────────────────────────

describe('OperationsContext interface', () => {
  it('should export OperationsContext type from the context file', async () => {
    const mod = await import('@/repositories/contexts/operations');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });

  it('should have createOperationsContext factory function', async () => {
    const mod = await import('@/repositories/contexts/operations');
    expect(typeof mod.createOperationsContext).toBe('function');
  });
});

// ─── Task 3.4: OperationsContext Implementation Tests ─────────────────────────

describe('createOperationsContext', () => {
  let createOperationsContext: typeof import('@/repositories/contexts/operations').createOperationsContext;

  beforeAll(async () => {
    const mod = await import('@/repositories/contexts/operations');
    createOperationsContext = mod.createOperationsContext;
  });

  const mockOrdersRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    listByUserId: jest.fn(),
    markPaid: jest.fn(),
  };

  const mockPaymentOrdersRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    listByUserId: jest.fn(),
    listAll: jest.fn(),
    updateForUser: jest.fn(),
    approve: jest.fn(),
    setAdminNotes: jest.fn(),
    reject: jest.fn(),
  };

  const mockRecurringTransactionsRepo = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    findDueForExecution: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleActive: jest.fn(),
    getSummary: jest.fn(),
    createFromTransaction: jest.fn(),
    updateNextExecution: jest.fn(),
  };

  const mockTransfersRepo = {
    listByUserId: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const mockNotificationsRepo = {
    findByUserId: jest.fn(),
    findUnreadByUserId: jest.fn(),
    countUnreadByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    delete: jest.fn(),
    deleteAllRead: jest.fn(),
    deleteByUserId: jest.fn(),
  };

  const mockApprovalRequestsRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listByUserId: jest.fn(),
    respond: jest.fn(),
    markTimeout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an operations context with all required repositories', () => {
    const context = createOperationsContext({
      orders: mockOrdersRepo as never,
      paymentOrders: mockPaymentOrdersRepo as never,
      recurringTransactions: mockRecurringTransactionsRepo as never,
      transfers: mockTransfersRepo as never,
      notifications: mockNotificationsRepo as never,
      approvalRequests: mockApprovalRequestsRepo as never,
    });

    expect(context).toBeDefined();
    expect(context.orders).toBe(mockOrdersRepo);
    expect(context.paymentOrders).toBe(mockPaymentOrdersRepo);
    expect(context.recurringTransactions).toBe(mockRecurringTransactionsRepo);
    expect(context.transfers).toBe(mockTransfersRepo);
    expect(context.notifications).toBe(mockNotificationsRepo);
    expect(context.approvalRequests).toBe(mockApprovalRequestsRepo);
  });

  it('should expose orders repository with correct interface', () => {
    const context = createOperationsContext({
      orders: mockOrdersRepo as never,
      paymentOrders: mockPaymentOrdersRepo as never,
      recurringTransactions: mockRecurringTransactionsRepo as never,
      transfers: mockTransfersRepo as never,
      notifications: mockNotificationsRepo as never,
      approvalRequests: mockApprovalRequestsRepo as never,
    });

    expect(typeof context.orders.create).toBe('function');
    expect(typeof context.orders.findById).toBe('function');
    expect(typeof context.orders.markPaid).toBe('function');
  });

  it('should expose payment orders repository with correct interface', () => {
    const context = createOperationsContext({
      orders: mockOrdersRepo as never,
      paymentOrders: mockPaymentOrdersRepo as never,
      recurringTransactions: mockRecurringTransactionsRepo as never,
      transfers: mockTransfersRepo as never,
      notifications: mockNotificationsRepo as never,
      approvalRequests: mockApprovalRequestsRepo as never,
    });

    expect(typeof context.paymentOrders.approve).toBe('function');
    expect(typeof context.paymentOrders.reject).toBe('function');
  });

  it('should expose recurring transactions repository with correct interface', () => {
    const context = createOperationsContext({
      orders: mockOrdersRepo as never,
      paymentOrders: mockPaymentOrdersRepo as never,
      recurringTransactions: mockRecurringTransactionsRepo as never,
      transfers: mockTransfersRepo as never,
      notifications: mockNotificationsRepo as never,
      approvalRequests: mockApprovalRequestsRepo as never,
    });

    expect(typeof context.recurringTransactions.findDueForExecution).toBe('function');
    expect(typeof context.recurringTransactions.getSummary).toBe('function');
  });

  it('should expose transfers repository with correct interface', () => {
    const context = createOperationsContext({
      orders: mockOrdersRepo as never,
      paymentOrders: mockPaymentOrdersRepo as never,
      recurringTransactions: mockRecurringTransactionsRepo as never,
      transfers: mockTransfersRepo as never,
      notifications: mockNotificationsRepo as never,
      approvalRequests: mockApprovalRequestsRepo as never,
    });

    expect(typeof context.transfers.listByUserId).toBe('function');
    expect(typeof context.transfers.create).toBe('function');
  });

  it('should expose notifications repository with correct interface', () => {
    const context = createOperationsContext({
      orders: mockOrdersRepo as never,
      paymentOrders: mockPaymentOrdersRepo as never,
      recurringTransactions: mockRecurringTransactionsRepo as never,
      transfers: mockTransfersRepo as never,
      notifications: mockNotificationsRepo as never,
      approvalRequests: mockApprovalRequestsRepo as never,
    });

    expect(typeof context.notifications.findByUserId).toBe('function');
    expect(typeof context.notifications.markAsRead).toBe('function');
    expect(typeof context.notifications.markAllAsRead).toBe('function');
  });

  it('should expose approval requests repository with correct interface', () => {
    const context = createOperationsContext({
      orders: mockOrdersRepo as never,
      paymentOrders: mockPaymentOrdersRepo as never,
      recurringTransactions: mockRecurringTransactionsRepo as never,
      transfers: mockTransfersRepo as never,
      notifications: mockNotificationsRepo as never,
      approvalRequests: mockApprovalRequestsRepo as never,
    });

    expect(typeof context.approvalRequests.respond).toBe('function');
    expect(typeof context.approvalRequests.markTimeout).toBe('function');
  });
});
