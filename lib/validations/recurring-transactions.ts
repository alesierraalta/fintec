import { z } from 'zod';
import { TransactionType } from '@/types/domain';

export const RecurringFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);

function isValidIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const recurringTransactionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(isValidIsoDateString, 'Date must be a valid calendar date');

const recurringTransactionUpdateFieldsSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name must be less than 255 characters')
      .optional(),
    type: z.nativeEnum(TransactionType).optional(),
    accountId: z.string().min(1, 'Account is required').optional(),
    categoryId: z.string().min(1, 'Category is required').optional(),
    currencyCode: z
      .string()
      .length(3, 'Currency code must be 3 characters')
      .optional(),
    amountMinor: z
      .number()
      .int('Amount must be an integer')
      .positive('Amount must be positive')
      .optional(),
    description: z
      .string()
      .max(255, 'Description must be less than 255 characters')
      .optional(),
    note: z.string().max(500, 'Note too long').optional(),
    tags: z.array(z.string().max(50, 'Tag too long')).optional(),
    frequency: RecurringFrequencySchema.optional(),
    intervalCount: z
      .number()
      .int('Interval count must be an integer')
      .positive('Interval count must be positive')
      .optional(),
    startDate: recurringTransactionDateSchema.optional(),
    endDate: recurringTransactionDateSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const UpdateRecurringTransactionPayloadSchema =
  recurringTransactionUpdateFieldsSchema
    .extend({
      id: z.string().min(1, 'id is required'),
    })
    .superRefine((data, ctx) => {
      const { id, ...updateFields } = data;
      void id;

      if (Object.keys(updateFields).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one updatable field must be provided',
          path: ['id'],
        });
      }

      if (
        data.startDate !== undefined &&
        data.endDate !== undefined &&
        data.endDate < data.startDate
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'endDate must be greater than or equal to startDate',
          path: ['endDate'],
        });
      }
    });

export const DeleteRecurringTransactionQuerySchema = z
  .object({
    id: z.string().min(1, 'id is required'),
  })
  .strict();

export type UpdateRecurringTransactionPayloadType = z.infer<
  typeof UpdateRecurringTransactionPayloadSchema
>;
export type DeleteRecurringTransactionQueryType = z.infer<
  typeof DeleteRecurringTransactionQuerySchema
>;
