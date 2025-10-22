import { z } from 'zod';

// Transaction Types
export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER_OUT']);

// Base Transaction Schema
export const TransactionSchema = z.object({
  id: z.string().uuid().optional(),
  type: TransactionTypeSchema,
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().min(1, 'Category is required'),
  currencyCode: z.string().length(3, 'Currency code must be 3 characters').default('USD'),
  amountMinor: z.number().int().positive('Amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().min(1, 'Description is required').max(255, 'Description too long'),
  note: z.string().max(500, 'Note too long').optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Create Transaction DTO Schema
export const CreateTransactionSchema = TransactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update Transaction DTO Schema
export const UpdateTransactionSchema = TransactionSchema.partial().extend({
  id: z.string().uuid(),
});

// Transaction Form Schema (for UI forms)
export const TransactionFormSchema = z.object({
  type: TransactionTypeSchema,
  accountId: z.string().min(1, 'Please select an account'),
  categoryId: z.string().min(1, 'Please select a category'),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be a positive number',
    })
    .transform((val) => parseFloat(val)),
  description: z.string()
    .min(1, 'Description is required')
    .max(255, 'Description must be less than 255 characters'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  note: z.string().max(500, 'Note must be less than 500 characters').optional(),
  tags: z.string()
    .optional()
    .transform((val) => val ? val.split(',').map(tag => tag.trim()).filter(Boolean) : undefined),
  isRecurring: z.boolean().default(false),
  frequency: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
});

// Account Schema
export const AccountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Account name is required').max(100, 'Name too long'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT', 'CASH', 'INVESTMENT']),
  currencyCode: z.string().length(3, 'Currency code must be 3 characters').default('USD'),
  balanceMinor: z.number().int().default(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CreateAccountSchema = AccountSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateAccountSchema = AccountSchema.partial().extend({
  id: z.string().uuid(),
});

// Account Form Schema (for UI forms)
export const AccountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100, 'Name too long'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT', 'CASH', 'INVESTMENT']),
  currencyCode: z.string().length(3).default('USD'),
  balance: z.string()
    .optional()
    .refine((val) => !val || !isNaN(parseFloat(val)), {
      message: 'Balance must be a valid number',
    })
    .transform((val) => val ? parseFloat(val) : 0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().max(50).optional(),
});

// Category Schema
export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
  type: TransactionTypeSchema,
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().max(50),
  parentId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CreateCategorySchema = CategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCategorySchema = CategorySchema.partial().extend({
  id: z.string().uuid(),
});

// Category Form Schema
export const CategoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
  type: TransactionTypeSchema,
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().max(50),
  parentId: z.string().uuid().optional(),
});

// Budget Schema
const BudgetBaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Budget name is required').max(100, 'Name too long'),
  categoryId: z.string().uuid(),
  amountMinor: z.number().int().positive('Budget amount must be positive'),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const BudgetSchema = BudgetBaseSchema.refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const CreateBudgetSchema = BudgetBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const UpdateBudgetSchema = BudgetBaseSchema.partial().extend({
  id: z.string().uuid(),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Budget Form Schema
export const BudgetFormSchema = z.object({
  name: z.string().min(1, 'Budget name is required').max(100, 'Name too long'),
  categoryId: z.string().min(1, 'Please select a category'),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be a positive number',
    })
    .transform((val) => parseFloat(val)),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Goal Schema
export const GoalSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Goal name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  targetAmountMinor: z.number().int().positive('Target amount must be positive'),
  currentAmountMinor: z.number().int().min(0).default(0),
  currencyCode: z.string().length(3).default('USD'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  category: z.enum(['EMERGENCY', 'VACATION', 'PURCHASE', 'EDUCATION', 'RETIREMENT', 'OTHER']),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CreateGoalSchema = GoalSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateGoalSchema = GoalSchema.partial().extend({
  id: z.string().uuid(),
});

// Goal Form Schema
export const GoalFormSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  targetAmount: z.string()
    .min(1, 'Target amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Target amount must be a positive number',
    })
    .transform((val) => parseFloat(val)),
  currentAmount: z.string()
    .optional()
    .refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: 'Current amount must be a non-negative number',
    })
    .transform((val) => val ? parseFloat(val) : 0),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  category: z.enum(['EMERGENCY', 'VACATION', 'PURCHASE', 'EDUCATION', 'RETIREMENT', 'OTHER']),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().max(50).optional(),
});

// Exchange Rate Schema
export const ExchangeRateSchema = z.object({
  id: z.string().uuid().optional(),
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.number().positive('Exchange rate must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  source: z.string().max(100).optional(),
  createdAt: z.string().datetime().optional(),
});

export const CreateExchangeRateSchema = ExchangeRateSchema.omit({
  id: true,
  createdAt: true,
});

// Generic API Response Schema
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Filter Schemas
export const TransactionFiltersSchema = z.object({
  type: TransactionTypeSchema.optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  search: z.string().max(255).optional(),
  tags: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
}).refine((data) => {
  if (data.minAmount && data.maxAmount) {
    return data.maxAmount >= data.minAmount;
  }
  return true;
}, {
  message: 'Maximum amount must be greater than or equal to minimum amount',
  path: ['maxAmount'],
});

// Export types
export type TransactionType = z.infer<typeof TransactionSchema>;
export type CreateTransactionType = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionType = z.infer<typeof UpdateTransactionSchema>;
export type TransactionFormType = z.infer<typeof TransactionFormSchema>;

export type AccountType = z.infer<typeof AccountSchema>;
export type CreateAccountType = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountType = z.infer<typeof UpdateAccountSchema>;
export type AccountFormType = z.infer<typeof AccountFormSchema>;

export type CategoryType = z.infer<typeof CategorySchema>;
export type CreateCategoryType = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryType = z.infer<typeof UpdateCategorySchema>;
export type CategoryFormType = z.infer<typeof CategoryFormSchema>;

export type BudgetType = z.infer<typeof BudgetSchema>;
export type CreateBudgetType = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetType = z.infer<typeof UpdateBudgetSchema>;
export type BudgetFormType = z.infer<typeof BudgetFormSchema>;

export type GoalType = z.infer<typeof GoalSchema>;
export type CreateGoalType = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalType = z.infer<typeof UpdateGoalSchema>;
export type GoalFormType = z.infer<typeof GoalFormSchema>;

export type ExchangeRateType = z.infer<typeof ExchangeRateSchema>;
export type CreateExchangeRateType = z.infer<typeof CreateExchangeRateSchema>;

export type PaginationType = z.infer<typeof PaginationSchema>;
export type TransactionFiltersType = z.infer<typeof TransactionFiltersSchema>;
