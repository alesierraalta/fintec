'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionKeys } from './transaction-keys';
import { accountKeys } from './account-keys';
import { categoryKeys } from './category-keys';
import type { CreateTransactionDTO, UpdateTransactionDTO } from '@/lib/services/transaction-service.interface';
import type { CreateAccountDTO, UpdateAccountDTO } from '@/lib/services/account-service.interface';
import type { CreateCategoryDTO, UpdateCategoryDTO } from '@/lib/services/category-service.interface';
import type { Transaction, Account, Category } from '@/types';

// ─── Transaction Mutations ─────────────────────────────────────────────────────

/**
 * Mutation hook for creating a transaction.
 * Invalidates transaction list queries on success.
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTransactionDTO): Promise<Transaction> => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      const envelope = await response.json();
      return envelope.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

/**
 * Mutation hook for updating a transaction.
 * Invalidates transaction list and detail queries on success.
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: Omit<UpdateTransactionDTO, 'id'>;
    }): Promise<Transaction> => {
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...dto }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      const envelope = await response.json();
      return envelope.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Mutation hook for deleting a transaction.
 * Invalidates transaction list queries on success.
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

// ─── Account Mutations ─────────────────────────────────────────────────────────

/**
 * Mutation hook for creating an account.
 * Invalidates account list queries on success.
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateAccountDTO): Promise<Account> => {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        throw new Error('Failed to create account');
      }

      const envelope = await response.json();
      return envelope.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

/**
 * Mutation hook for updating an account.
 * Invalidates account list and detail queries on success.
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateAccountDTO;
    }): Promise<Account> => {
      const response = await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...dto }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account');
      }

      const envelope = await response.json();
      return envelope.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({
        queryKey: accountKeys.detail(variables.id),
      });
    },
  });
}

// ─── Category Mutations ────────────────────────────────────────────────────────

/**
 * Mutation hook for creating a category.
 * Invalidates category list queries on success.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCategoryDTO): Promise<Category> => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      const envelope = await response.json();
      return envelope.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Mutation hook for updating a category.
 * Invalidates category list and detail queries on success.
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateCategoryDTO;
    }): Promise<Category> => {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...dto }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      const envelope = await response.json();
      return envelope.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: categoryKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Mutation hook for deleting a category.
 * Invalidates category list queries on success.
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
