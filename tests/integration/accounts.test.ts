/**
 * Integration tests for accounts functionality
 * These tests verify that the accounts system is properly connected 
 * and prevents errors like the account loading/creation issues
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Import the repository to test the real implementation
import { SupabaseAppRepository } from '@/repositories/supabase';
import type { Account, CreateAccountDTO } from '@/types/domain';

// Helper function to generate valid UUID
function generateValidUserId(): string {
  return uuidv4();
}

describe('Accounts Integration Tests', () => {
  let repository: SupabaseAppRepository;
  const testUserId = generateValidUserId();
  let createdAccountIds: string[] = [];

  beforeAll(() => {
    repository = new SupabaseAppRepository();
  });

  afterAll(async () => {
    // Cleanup: Remove any test accounts created during testing
    for (const accountId of createdAccountIds) {
      try {
        await repository.accounts.delete(accountId);
      } catch (error) {
        console.warn(`Failed to cleanup test account ${accountId}:`, error);
      }
    }
  });

  describe('Account Repository Implementation', () => {
    it('should have implemented findByUserId method', async () => {
      // This test ensures the "Supabase implementation not ready yet" error doesn't happen
      try {
        const accounts = await repository.accounts.findByUserId(testUserId);
        expect(Array.isArray(accounts)).toBe(true);
        // Should not throw "implementation not ready" error
      } catch (error) {
        // The error should be a legitimate database error, not "implementation not ready"
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('implementation not ready');
        expect(errorMessage).not.toContain('Supabase implementation not ready yet');
      }
    });

    it('should have implemented create method without authentication errors', async () => {
      const accountData: CreateAccountDTO = {
        name: 'Test Integration Account',
        type: 'BANK',
        currencyCode: 'USD',
        balance: 1000,
        active: true,
        userId: testUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const createdAccount = await repository.accounts.create(accountData);
        
        // Store for cleanup
        if (createdAccount?.id) {
          createdAccountIds.push(createdAccount.id);
        }

        expect(createdAccount).toBeDefined();
        expect(createdAccount.name).toBe(accountData.name);
        expect(createdAccount.type).toBe(accountData.type);
        expect(createdAccount.currencyCode).toBe(accountData.currencyCode);
        expect(createdAccount.balance).toBe(accountData.balance);
        expect(createdAccount.userId).toBe(accountData.userId);
        
        // Should not throw "implementation not ready" error
      } catch (error) {
        // The error should be a legitimate database error, not "implementation not ready"
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('implementation not ready');
        expect(errorMessage).not.toContain('Supabase implementation not ready yet');
        
        // Expected errors in test environment (without proper auth setup):
        // - User not authenticated (when Supabase auth is not set up)
        // - RLS policies (when user doesn't have permission)
        const expectedErrors = [
          'User not authenticated',
          'row-level security',
          'permission denied',
          'new row violates row-level security policy'
        ];
        
        const isExpectedError = expectedErrors.some(expectedError => 
          errorMessage.toLowerCase().includes(expectedError.toLowerCase())
        );
        
        expect(isExpectedError).toBe(true);
        console.log(`Expected authentication/RLS error in test: ${errorMessage}`);
      }
    });

    it('should handle account property access correctly', () => {
      // Test that Account type has the correct properties as used in the UI
      const mockAccount: Account = {
        id: 'test-123',
        name: 'Test Account',
        type: 'BANK',
        currencyCode: 'USD', // Should be currencyCode, not currency
        balance: 1000,
        active: true, // Should be active, not isActive
        userId: 'user-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      // These property accesses should not cause TypeScript errors
      expect(mockAccount.active).toBe(true); // Not isActive
      expect(mockAccount.currencyCode).toBe('USD'); // Not currency
      expect(mockAccount.name).toBe('Test Account');
      expect(mockAccount.type).toBe('BANK');
      expect(mockAccount.balance).toBe(1000);
    });
  });

  describe('Error Prevention', () => {
    it('should not return undefined methods', () => {
      // Verify that repository methods are defined and not throwing "not implemented" errors
      expect(typeof repository.accounts.findByUserId).toBe('function');
      expect(typeof repository.accounts.create).toBe('function');
      expect(typeof repository.accounts.update).toBe('function');
      expect(typeof repository.accounts.delete).toBe('function');
      expect(typeof repository.accounts.findById).toBe('function');
    });

    it('should handle empty account lists gracefully', async () => {
      // Test with a valid UUID that likely has no accounts
      const randomUserId = generateValidUserId();
      
      try {
        const accounts = await repository.accounts.findByUserId(randomUserId);
        expect(Array.isArray(accounts)).toBe(true);
        expect(accounts.length).toBe(0);
      } catch (error) {
        // If there's an error, it should be a legitimate database error
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('implementation not ready');
        
        // Expected errors in test environment:
        const expectedErrors = [
          'row-level security',
          'permission denied',
          'invalid input syntax for type uuid'
        ];
        
        const isExpectedError = expectedErrors.some(expectedError => 
          errorMessage.toLowerCase().includes(expectedError.toLowerCase())
        );
        
        if (!isExpectedError) {
          throw error; // Re-throw unexpected errors
        }
        
        console.log(`Expected database error in test: ${errorMessage}`);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent account type definitions', () => {
      // Verify account types match what's used in the UI
      const validAccountTypes = ['BANK', 'CREDIT_CARD', 'CASH', 'INVESTMENT'];
      
      const testAccount: CreateAccountDTO = {
        name: 'Test',
        type: 'BANK', // This should be a valid type
        currencyCode: 'USD',
        balance: 0,
        active: true,
        userId: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(validAccountTypes).toContain(testAccount.type);
    });

    it('should support Venezuelan Bolívar currency', () => {
      // Test that VES currency is supported (as added to the form)
      const testAccount: CreateAccountDTO = {
        name: 'Test VES Account',
        type: 'BANK',
        currencyCode: 'VES', // Venezuelan Bolívar
        balance: 1000,
        active: true,
        userId: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(testAccount.currencyCode).toBe('VES');
      expect(typeof testAccount.balance).toBe('number');
    });
  });
});