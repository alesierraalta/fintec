import {
  Transaction,
  TransactionType,
  TransactionFilters,
  PaginatedResult,
  PaginationParams,
  MonthlyReport,
  CashFlowData,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  CreateTransferDTO,
} from '@/types';
import { TransactionsRepository } from '@/repositories/contracts';
import { db } from './db';
import { generateId } from '@/lib/utils';
import { getMonthBounds, formatDate } from '@/lib/dates';
import { exportTransactionsToCSV } from '@/lib/csv';

export class LocalTransactionsRepository implements TransactionsRepository {
  async findById(id: string): Promise<Transaction | null> {
    return (await db.transactions.get(id)) || null;
  }

  async findAll(): Promise<Transaction[]> {
    return db.transactions.orderBy('date').reverse().toArray();
  }

  async create(data: CreateTransactionDTO): Promise<Transaction> {
    const transaction: Transaction = {
      id: generateId('txn'),
      type: data.type,
      accountId: data.accountId,
      categoryId: data.categoryId,
      currencyCode: data.currencyCode,
      amountMinor: data.amountMinor,
      amountBaseMinor: data.amountMinor, // TODO: Convert using exchange rate
      exchangeRate: 1, // TODO: Get actual exchange rate
      date: data.date,
      description: data.description,
      note: data.note,
      tags: data.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.transactions.add(transaction);
    
    // Update account balance
    await this.updateAccountBalance(data.accountId, data.amountMinor, data.type);
    
    return transaction;
  }

  async update(id: string, data: UpdateTransactionDTO): Promise<Transaction> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    // Revert old balance change
    await this.updateAccountBalance(
      existing.accountId,
      -existing.amountMinor,
      existing.type
    );

    const updated: Transaction = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await db.transactions.put(updated);
    
    // Apply new balance change
    await this.updateAccountBalance(
      updated.accountId,
      updated.amountMinor,
      updated.type
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const transaction = await this.findById(id);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    // Revert balance change
    await this.updateAccountBalance(
      transaction.accountId,
      -transaction.amountMinor,
      transaction.type
    );

    await db.transactions.delete(id);
  }

  async createMany(data: CreateTransactionDTO[]): Promise<Transaction[]> {
    const transactions: Transaction[] = [];

    await db.transaction('rw', [db.transactions, db.accounts], async () => {
      for (const item of data) {
        const transaction = await this.create(item);
        transactions.push(transaction);
      }
    });

    return transactions;
  }

  async deleteMany(ids: string[]): Promise<void> {
    await db.transaction('rw', [db.transactions, db.accounts], async () => {
      for (const id of ids) {
        await this.delete(id);
      }
    });
  }

  async findPaginated(params: PaginationParams): Promise<PaginatedResult<Transaction>> {
    const { page, limit, sortBy = 'date', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    let query = db.transactions.orderBy(sortBy as keyof Transaction);
    if (sortOrder === 'desc') {
      query = query.reverse();
    }

    const total = await db.transactions.count();
    const data = await query.offset(offset).limit(limit).toArray();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async count(): Promise<number> {
    return db.transactions.count();
  }

  async exists(id: string): Promise<boolean> {
    return (await db.transactions.get(id)) !== undefined;
  }

  // Transaction-specific methods
  async findByFilters(
    filters: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    let query = db.transactions.toCollection();

    // Apply filters
    if (filters.accountIds?.length) {
      query = query.filter(t => filters.accountIds!.includes(t.accountId));
    }

    if (filters.categoryIds?.length) {
      query = query.filter(t => t.categoryId ? filters.categoryIds!.includes(t.categoryId) : false);
    }

    if (filters.types?.length) {
      query = query.filter(t => filters.types!.includes(t.type));
    }

    if (filters.dateFrom) {
      query = query.filter(t => t.date >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      query = query.filter(t => t.date <= filters.dateTo!);
    }

    if (filters.amountMin !== undefined) {
      query = query.filter(t => Math.abs(t.amountMinor) >= filters.amountMin!);
    }

    if (filters.amountMax !== undefined) {
      query = query.filter(t => Math.abs(t.amountMinor) <= filters.amountMax!);
    }

    if (filters.currencyCode) {
      query = query.filter(t => t.currencyCode === filters.currencyCode);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      query = query.filter(t =>
        (t.description?.toLowerCase().includes(searchTerm) || false) ||
        (t.note?.toLowerCase().includes(searchTerm) || false)
      );
    }

    if (filters.tags?.length) {
      query = query.filter(t =>
        t.tags?.some(tag => filters.tags!.includes(tag)) || false
      );
    }

    // Apply pagination
    const total = await query.count();
    
    if (pagination) {
      const { page, limit, sortBy = 'date', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;
      
      // Sort results
      let sortedQuery = query.sortBy(sortBy as keyof Transaction);
      if (sortOrder === 'desc') {
        sortedQuery = query.reverse().sortBy(sortBy as keyof Transaction);
      }
      
      const data = (await sortedQuery).slice(offset, offset + limit);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const data = await query.reverse().sortBy('date');
    
    return {
      data,
      total,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }

  async findByAccountId(
    accountId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    return this.findByFilters({ accountIds: [accountId] }, pagination);
  }

  async findByCategoryId(
    categoryId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    return this.findByFilters({ categoryIds: [categoryId] }, pagination);
  }

  async findByType(
    type: TransactionType,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    return this.findByFilters({ types: [type] }, pagination);
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    return this.findByFilters({ dateFrom: startDate, dateTo: endDate }, pagination);
  }

  async findByTransferId(transferId: string): Promise<Transaction[]> {
    return db.transactions.where('transferId').equals(transferId).toArray();
  }

  async search(
    query: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    return this.findByFilters({ search: query }, pagination);
  }

  async getTotalByType(
    type: TransactionType,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const filters: TransactionFilters = { types: [type] };
    if (startDate) filters.dateFrom = startDate;
    if (endDate) filters.dateTo = endDate;

    const result = await this.findByFilters(filters);
    return result.data.reduce((total, t) => total + Math.abs(t.amountBaseMinor), 0);
  }

  async getTotalByCategory(
    categoryId: string,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const filters: TransactionFilters = { categoryIds: [categoryId] };
    if (startDate) filters.dateFrom = startDate;
    if (endDate) filters.dateTo = endDate;

    const result = await this.findByFilters(filters);
    return result.data.reduce((total, t) => total + Math.abs(t.amountBaseMinor), 0);
  }

  async getTotalByAccount(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const filters: TransactionFilters = { accountIds: [accountId] };
    if (startDate) filters.dateFrom = startDate;
    if (endDate) filters.dateTo = endDate;

    const result = await this.findByFilters(filters);
    return result.data.reduce((total, t) => total + Math.abs(t.amountBaseMinor), 0);
  }

  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const monthYear = `${year}-${month.toString().padStart(2, '0')}`;
    const { start, end } = getMonthBounds(monthYear);

    const transactions = await this.findByDateRange(start, end);
    const incomeTransactions = transactions.data.filter(t => t.type === TransactionType.INCOME);
    const expenseTransactions = transactions.data.filter(t => t.type === TransactionType.EXPENSE);

    const totalIncomeBaseMinor = incomeTransactions.reduce((sum, t) => sum + t.amountBaseMinor, 0);
    const totalExpenseBaseMinor = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amountBaseMinor), 0);

    // Get categories for breakdown
    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const categoryBreakdown = await this.getCategoryBreakdown(start, end);
    const accounts = await db.accounts.toArray();
    const accountBreakdown = accounts.map(account => ({
      accountId: account.id,
      accountName: account.name,
      totalBaseMinor: transactions.data
        .filter(t => t.accountId === account.id)
        .reduce((sum, t) => sum + Math.abs(t.amountBaseMinor), 0),
      transactionCount: transactions.data.filter(t => t.accountId === account.id).length,
    }));

    return {
      month: monthYear,
      totalIncomeBaseMinor,
      totalExpenseBaseMinor,
      netBaseMinor: totalIncomeBaseMinor - totalExpenseBaseMinor,
      transactionCount: transactions.data.length,
      categoryBreakdown,
      accountBreakdown,
    };
  }

  async getMonthlyReports(startMonth: string, endMonth: string): Promise<MonthlyReport[]> {
    const reports: MonthlyReport[] = [];
    const [startYear, startMonthNum] = startMonth.split('-').map(Number);
    const [endYear, endMonthNum] = endMonth.split('-').map(Number);

    let currentYear = startYear;
    let currentMonth = startMonthNum;

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonthNum)) {
      const report = await this.getMonthlyReport(currentYear, currentMonth);
      reports.push(report);

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    return reports;
  }

  async getCashFlowData(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<CashFlowData[]> {
    const transactions = await this.findByDateRange(startDate, endDate);
    
    // Group transactions by date period
    const groupedData = new Map<string, CashFlowData>();

    for (const transaction of transactions.data) {
      let periodKey: string;
      const date = new Date(transaction.date);

      switch (groupBy) {
        case 'day':
          periodKey = transaction.date.split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default:
          periodKey = transaction.date.split('T')[0];
      }

      if (!groupedData.has(periodKey)) {
        groupedData.set(periodKey, {
          date: periodKey,
          incomeBaseMinor: 0,
          expenseBaseMinor: 0,
          netBaseMinor: 0,
          cumulativeBaseMinor: 0,
        });
      }

      const data = groupedData.get(periodKey)!;
      if (transaction.type === TransactionType.INCOME) {
        data.incomeBaseMinor += transaction.amountBaseMinor;
      } else if (transaction.type === TransactionType.EXPENSE) {
        data.expenseBaseMinor += Math.abs(transaction.amountBaseMinor);
      }
    }

    // Calculate net and cumulative amounts
    const sortedData = Array.from(groupedData.values()).sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;

    for (const data of sortedData) {
      data.netBaseMinor = data.incomeBaseMinor - data.expenseBaseMinor;
      cumulative += data.netBaseMinor;
      data.cumulativeBaseMinor = cumulative;
    }

    return sortedData;
  }

  async getCategoryBreakdown(
    startDate: string,
    endDate: string,
    type?: TransactionType
  ): Promise<{
    categoryId: string;
    categoryName: string;
    totalBaseMinor: number;
    transactionCount: number;
    percentage: number;
  }[]> {
    const filters: TransactionFilters = { dateFrom: startDate, dateTo: endDate };
    if (type) filters.types = [type];

    const transactions = await this.findByFilters(filters);
    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const breakdown = new Map<string, {
      categoryId: string;
      categoryName: string;
      totalBaseMinor: number;
      transactionCount: number;
    }>();

    let totalAmount = 0;

    for (const transaction of transactions.data) {
      if (!transaction.categoryId) continue;

      const category = categoryMap.get(transaction.categoryId);
      if (!category) continue;

      const amount = Math.abs(transaction.amountBaseMinor);
      totalAmount += amount;

      if (!breakdown.has(transaction.categoryId)) {
        breakdown.set(transaction.categoryId, {
          categoryId: transaction.categoryId,
          categoryName: category.name,
          totalBaseMinor: 0,
          transactionCount: 0,
        });
      }

      const data = breakdown.get(transaction.categoryId)!;
      data.totalBaseMinor += amount;
      data.transactionCount++;
    }

    return Array.from(breakdown.values()).map(data => ({
      ...data,
      percentage: totalAmount > 0 ? (data.totalBaseMinor / totalAmount) * 100 : 0,
    })).sort((a, b) => b.totalBaseMinor - a.totalBaseMinor);
  }

  async getAccountBreakdown(
    startDate: string,
    endDate: string,
    type?: TransactionType
  ): Promise<{
    accountId: string;
    accountName: string;
    totalBaseMinor: number;
    transactionCount: number;
  }[]> {
    const filters: TransactionFilters = { dateFrom: startDate, dateTo: endDate };
    if (type) filters.types = [type];

    const transactions = await this.findByFilters(filters);
    const accounts = await db.accounts.toArray();
    const accountMap = new Map(accounts.map(a => [a.id, a]));

    const breakdown = new Map<string, {
      accountId: string;
      accountName: string;
      totalBaseMinor: number;
      transactionCount: number;
    }>();

    for (const transaction of transactions.data) {
      const account = accountMap.get(transaction.accountId);
      if (!account) continue;

      if (!breakdown.has(transaction.accountId)) {
        breakdown.set(transaction.accountId, {
          accountId: transaction.accountId,
          accountName: account.name,
          totalBaseMinor: 0,
          transactionCount: 0,
        });
      }

      const data = breakdown.get(transaction.accountId)!;
      data.totalBaseMinor += Math.abs(transaction.amountBaseMinor);
      data.transactionCount++;
    }

    return Array.from(breakdown.values()).sort((a, b) => b.totalBaseMinor - a.totalBaseMinor);
  }

  async createTransfer(
    fromTransaction: CreateTransactionDTO,
    toTransaction: CreateTransactionDTO
  ): Promise<{
    fromTransaction: Transaction;
    toTransaction: Transaction;
    transferId: string;
  }> {
    const transferId = generateId('transfer');

    await db.transaction('rw', [db.transactions, db.transfers, db.accounts], async () => {
      // Create the outgoing transaction
      const fromTxn = await this.create({
        ...fromTransaction,
        type: TransactionType.TRANSFER_OUT,
      });
      fromTxn.transferId = transferId;
      await db.transactions.put(fromTxn);

      // Create the incoming transaction
      const toTxn = await this.create({
        ...toTransaction,
        type: TransactionType.TRANSFER_IN,
      });
      toTxn.transferId = transferId;
      await db.transactions.put(toTxn);

      // Create the transfer record
      await db.transfers.add({
        id: transferId,
        fromTransactionId: fromTxn.id,
        toTransactionId: toTxn.id,
        createdAt: new Date().toISOString(),
      });

      return { fromTransaction: fromTxn, toTransaction: toTxn, transferId };
    });

    const fromTxn = await this.findById(transferId + '_from');
    const toTxn = await this.findById(transferId + '_to');

    return {
      fromTransaction: fromTxn!,
      toTransaction: toTxn!,
      transferId,
    };
  }

  async exportToCSV(filters?: TransactionFilters): Promise<string> {
    const transactions = filters 
      ? (await this.findByFilters(filters)).data 
      : await this.findAll();
    
    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();

    return exportTransactionsToCSV(transactions, accounts, categories);
  }

  // Helper method to update account balance
  private async updateAccountBalance(
    accountId: string,
    amountMinor: number,
    transactionType: TransactionType
  ): Promise<void> {
    const account = await db.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account with id ${accountId} not found`);
    }

    let balanceChange = 0;
    switch (transactionType) {
      case TransactionType.INCOME:
      case TransactionType.TRANSFER_IN:
        balanceChange = amountMinor;
        break;
      case TransactionType.EXPENSE:
      case TransactionType.TRANSFER_OUT:
        balanceChange = -Math.abs(amountMinor);
        break;
    }

    const newBalance = account.balance + balanceChange;
    await db.accounts.update(accountId, { 
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    });
  }
}
