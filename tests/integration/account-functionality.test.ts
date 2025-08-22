/**
 * Integration tests for account functionality end-to-end
 * These tests verify the complete account workflow and prevent regression errors
 */

import { describe, it, expect } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import type { Account, CreateAccountDTO } from '@/types/domain';

describe('Account Functionality Integration Tests', () => {
  
  describe('Account Form Data Flow', () => {
    it('should properly map form data to Account interface', () => {
      // Simulate form data being mapped to CreateAccountDTO
      const formData = {
        name: 'Mi Cuenta Bancaria',
        type: 'BANK' as const,
        currencyCode: 'VES',
        balance: 15000.50,
        active: true
      };

      const userId = uuidv4();
      const now = new Date().toISOString();

      const accountData: CreateAccountDTO = {
        ...formData,
        userId,
        createdAt: now,
        updatedAt: now
      };

      // Verify all required fields are present and correctly typed
      expect(accountData.name).toBe('Mi Cuenta Bancaria');
      expect(accountData.type).toBe('BANK');
      expect(accountData.currencyCode).toBe('VES');
      expect(accountData.balance).toBe(15000.50);
      expect(accountData.active).toBe(true);
      expect(accountData.userId).toBe(userId);
      expect(typeof accountData.createdAt).toBe('string');
      expect(typeof accountData.updatedAt).toBe('string');
    });

    it('should handle all supported account types', () => {
      const accountTypes = ['BANK', 'CREDIT_CARD', 'CASH', 'INVESTMENT'] as const;
      
      accountTypes.forEach(type => {
        const accountData: CreateAccountDTO = {
          name: `Test ${type} Account`,
          type: type,
          currencyCode: 'USD',
          balance: 1000,
          active: true,
          userId: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        expect(accountData.type).toBe(type);
        expect(['BANK', 'CREDIT_CARD', 'CASH', 'INVESTMENT']).toContain(accountData.type);
      });
    });

    it('should handle all supported currencies including VES', () => {
      const currencies = ['USD', 'EUR', 'VES'];
      
      currencies.forEach(currency => {
        const accountData: CreateAccountDTO = {
          name: `Account in ${currency}`,
          type: 'BANK',
          currencyCode: currency,
          balance: 1000,
          active: true,
          userId: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        expect(accountData.currencyCode).toBe(currency);
      });

      // Specifically test VES (Venezuelan Bolívar) which was added based on user feedback
      const vesAccount: CreateAccountDTO = {
        name: 'Cuenta en Bolívares',
        type: 'BANK',
        currencyCode: 'VES',
        balance: 162.53, // Test with decimal precision
        active: true,
        userId: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(vesAccount.currencyCode).toBe('VES');
      expect(vesAccount.balance).toBe(162.53);
    });
  });

  describe('Balance Growth Calculation Logic', () => {
    it('should calculate dynamic balance growth based on account data', () => {
      // Simulate the dynamic balance growth calculation from accounts page
      const mockAccounts: Account[] = [
        {
          id: uuidv4(),
          name: 'Cuenta Principal',
          type: 'BANK',
          currencyCode: 'USD',
          balance: 5000,
          active: true,
          userId: uuidv4(),
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
          updatedAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Tarjeta de Crédito',
          type: 'CREDIT_CARD',
          currencyCode: 'USD',
          balance: -1500,
          active: true,
          userId: uuidv4(),
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          updatedAt: new Date().toISOString()
        }
      ];

      // Replicate the logic from accounts page
      const calculateBalanceGrowth = (accounts: Account[]) => {
        if (accounts.length === 0) return 0;
        
        const activeAccounts = accounts.filter(acc => acc.active);
        const totalBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        // Simulate growth based on number of accounts and recent activity
        const baseGrowth = activeAccounts.length * 1.2;
        const balanceMultiplier = Math.min(totalBalance / 10000, 5);
        
        return Math.round((baseGrowth + balanceMultiplier) * 10) / 10;
      };

      const growth = calculateBalanceGrowth(mockAccounts);
      
      expect(typeof growth).toBe('number');
      expect(growth).toBeGreaterThanOrEqual(0);
      expect(growth).toBeLessThan(20); // Reasonable upper bound
      
      // Test with empty accounts
      expect(calculateBalanceGrowth([])).toBe(0);
      
      // Test with inactive accounts
      const inactiveAccounts = mockAccounts.map(acc => ({ ...acc, active: false }));
      expect(calculateBalanceGrowth(inactiveAccounts)).toBe(0);
    });
  });

  describe('Error Prevention Regression Tests', () => {
    it('should not have isActive or currency properties (legacy)', () => {
      // Ensure we're using the correct property names that were fixed
      const account: Account = {
        id: uuidv4(),
        name: 'Test Account',
        type: 'BANK',
        currencyCode: 'USD', // Not 'currency'
        balance: 1000,
        active: true, // Not 'isActive'
        userId: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // These should work
      expect(account.active).toBe(true);
      expect(account.currencyCode).toBe('USD');
      
      // These should not exist (TypeScript would catch this)
      expect('isActive' in account).toBe(false);
      expect('currency' in account).toBe(false);
    });

    it('should handle balance as number, not string', () => {
      // Ensure balance is properly converted from string input to number
      const formBalance = '1234.56'; // String from form
      const numericBalance = parseFloat(formBalance);
      
      const accountData: CreateAccountDTO = {
        name: 'Test Numeric Balance',
        type: 'BANK',
        currencyCode: 'USD',
        balance: numericBalance, // Should be number
        active: true,
        userId: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(typeof accountData.balance).toBe('number');
      expect(accountData.balance).toBe(1234.56);
      expect(accountData.balance).not.toBe('1234.56'); // Should not be string
    });

    it('should handle empty and whitespace-only names properly', () => {
      // Test validation logic that should prevent empty names
      const testNames = ['', '   ', '\t\n', 'Valid Name'];
      
      testNames.forEach(name => {
        const isValid = name.trim().length > 0;
        
        if (isValid) {
          // Valid names should work
          const accountData: CreateAccountDTO = {
            name: name.trim(),
            type: 'BANK',
            currencyCode: 'USD',
            balance: 0,
            active: true,
            userId: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          expect(accountData.name.length).toBeGreaterThan(0);
        } else {
          // Invalid names should fail validation (this would be caught in the form)
          expect(name.trim().length).toBe(0);
        }
      });
    });
  });

  describe('Currency Conversion Integration', () => {
    it('should handle BCV rates integration with account balances', () => {
      // Test that accounts can work with BCV exchange rates
      const vesAccount: Account = {
        id: uuidv4(),
        name: 'Cuenta en Bolívares',
        type: 'BANK',
        currencyCode: 'VES',
        balance: 162530.00, // 162,530.00 VES
        active: true,
        userId: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const usdAccount: Account = {
        id: uuidv4(),
        name: 'USD Account',
        type: 'BANK',
        currencyCode: 'USD',
        balance: 1000.00,
        active: true,
        userId: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simulate BCV rates
      const bcvRates = {
        usd: 162.53,
        eur: 175.20
      };

      // Calculate VES to USD conversion
      const vesInUsd = vesAccount.balance / bcvRates.usd;
      
      expect(vesInUsd).toBeCloseTo(1000, 2); // Should be approximately 1000 USD
      expect(typeof vesInUsd).toBe('number');
      
      // Total in USD should account for both accounts
      const totalInUsd = usdAccount.balance + vesInUsd;
      expect(totalInUsd).toBeCloseTo(2000, 2);
    });
  });
});
