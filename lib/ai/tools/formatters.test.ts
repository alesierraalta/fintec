import {
    formatCurrency,
    formatDate,
    getCategoryEmoji,
    formatTransactionsList,
    formatAccountBalance,
    formatTransactionCreated,
    formatGoalCreated,
} from './formatters';
import { TransactionType } from '@/types';

describe('AI Tools Formatters', () => {
    describe('formatCurrency', () => {
        it('should format positive amounts correctly', () => {
            expect(formatCurrency(123456, 'USD')).toBe('$1,234.56');
            expect(formatCurrency(100, 'USD')).toBe('$1.00');
            expect(formatCurrency(0, 'USD')).toBe('$0.00');
        });

        it('should format negative amounts correctly', () => {
            expect(formatCurrency(-123456, 'USD')).toBe('-$1,234.56');
            expect(formatCurrency(-100, 'USD')).toBe('-$1.00');
        });

        it('should handle different currencies', () => {
            expect(formatCurrency(123456, 'VES')).toBe('Bs.1,234.56');
            expect(formatCurrency(123456, 'EUR')).toBe('€1,234.56');
            expect(formatCurrency(123456, 'BTC')).toBe('₿1,234.56');
        });

        it('should use currency code as fallback for unknown currencies', () => {
            expect(formatCurrency(123456, 'XYZ')).toBe('XYZ1,234.56');
        });
    });

    describe('formatDate', () => {
        it('should format dates in Spanish', () => {
            expect(formatDate('2026-01-05')).toBe('05 Ene 2026');
            expect(formatDate('2025-12-30')).toBe('30 Dic 2025');
            expect(formatDate('2025-06-15')).toBe('15 Jun 2025');
        });

        it('should pad single-digit days', () => {
            expect(formatDate('2026-01-01')).toBe('01 Ene 2026');
            expect(formatDate('2026-02-05')).toBe('05 Feb 2026');
        });
    });

    describe('getCategoryEmoji', () => {
        it('should return correct emojis for common categories', () => {
            expect(getCategoryEmoji('Food')).toBe('🍽️');
            expect(getCategoryEmoji('comida')).toBe('🍽️');
            expect(getCategoryEmoji('Transport')).toBe('🚗');
            expect(getCategoryEmoji('gasolina')).toBe('⛽');
            expect(getCategoryEmoji('Salary')).toBe('💼');
            expect(getCategoryEmoji('quincena')).toBe('💼');
        });

        it('should be case-insensitive', () => {
            expect(getCategoryEmoji('FOOD')).toBe('🍽️');
            expect(getCategoryEmoji('food')).toBe('🍽️');
            expect(getCategoryEmoji('Food')).toBe('🍽️');
        });

        it('should return default emoji for unknown categories', () => {
            expect(getCategoryEmoji('UnknownCategory')).toBe('💰');
            expect(getCategoryEmoji('')).toBe('💰');
        });
    });

    describe('formatTransactionsList', () => {
        const mockTransactions = [
            {
                id: '1',
                description: 'Coffee',
                amountBaseMinor: 500,
                currencyCode: 'USD',
                date: '2026-01-05',
                type: 'EXPENSE' as TransactionType,
                categoryName: 'Food',
                accountId: 'acc1',
                amountMinor: 500,
                exchangeRate: 1,
                createdAt: '2026-01-05',
                updatedAt: '2026-01-05',
            },
            {
                id: '2',
                description: 'Salary',
                amountBaseMinor: 500000,
                currencyCode: 'USD',
                date: '2026-01-01',
                type: 'INCOME' as TransactionType,
                categoryName: 'Salary',
                accountId: 'acc1',
                amountMinor: 500000,
                exchangeRate: 1,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
            },
        ];

        it('should format empty transaction list', () => {
            const result = formatTransactionsList([], 10);
            expect(result).toBe('📭 No se encontraron transacciones.');
        });

        it('should include summary statistics', () => {
            const result = formatTransactionsList(mockTransactions, 10);
            expect(result).toContain('💰 Resumen:');
            expect(result).toContain('Total gastado: $5.00');
            expect(result).toContain('Total ingresado: $5,000.00');
            expect(result).toContain('Balance neto: $4,995.00');
        });

        it('should list transactions with emojis and formatting', () => {
            const result = formatTransactionsList(mockTransactions, 10);
            expect(result).toContain('📅 Transacciones recientes:');
            expect(result).toContain('🍽️ Coffee');
            expect(result).toContain('💼 Salary');
            expect(result).toContain('-$5.00');
            expect(result).toContain('+$5,000.00');
        });

        it('should respect limit parameter', () => {
            const manyTransactions = Array(20).fill(mockTransactions[0]);
            const result = formatTransactionsList(manyTransactions, 5);
            expect(result).toContain('(mostrando las 5 más recientes)');
            expect(result).toContain('... y 15 más');
        });
    });

    describe('formatAccountBalance', () => {
        it('should format single account', () => {
            const accounts = [{ name: 'Checking', balance: 123456, currencyCode: 'USD' }];
            const result = formatAccountBalance(accounts);
            expect(result).toBe('💰 Cuenta "Checking": $1,234.56');
        });

        it('should format multiple accounts', () => {
            const accounts = [
                { name: 'Checking', balance: 123456, currencyCode: 'USD' },
                { name: 'Savings', balance: 500000, currencyCode: 'USD' },
            ];
            const result = formatAccountBalance(accounts);
            expect(result).toContain('💰 Balances de cuentas:');
            expect(result).toContain('• Checking: $1,234.56');
            expect(result).toContain('• Savings: $5,000.00');
            expect(result).toContain('📊 Total USD: $6,234.56');
        });

        it('should handle empty accounts', () => {
            const result = formatAccountBalance([]);
            expect(result).toBe('❌ No se encontraron cuentas.');
        });
    });

    describe('formatTransactionCreated', () => {
        it('should format expense transaction', () => {
            const result = formatTransactionCreated({
                description: 'Coffee',
                amountBaseMinor: 500,
                currencyCode: 'USD',
                type: 'EXPENSE',
                categoryName: 'Food',
                date: '2026-01-05',
            });
            expect(result).toContain('💸 Gasto registrado exitosamente');
            expect(result).toContain('🍽️ Coffee');
            expect(result).toContain('💰 Monto: $5.00');
            expect(result).toContain('📅 Fecha: 05 Ene 2026');
            expect(result).toContain('🏷️ Categoría: Food');
        });

        it('should format income transaction', () => {
            const result = formatTransactionCreated({
                description: 'Salary',
                amountBaseMinor: 500000,
                currencyCode: 'USD',
                type: 'INCOME',
                categoryName: 'Salary',
                date: '2026-01-01',
            });
            expect(result).toContain('✅ Ingreso registrado exitosamente');
            expect(result).toContain('💼 Salary');
            expect(result).toContain('💰 Monto: $5,000.00');
        });
    });

    describe('formatGoalCreated', () => {
        it('should format goal creation', () => {
            const result = formatGoalCreated({
                name: 'Emergency Fund',
                targetBaseMinor: 1000000,
                targetDate: '2026-12-31',
            });
            expect(result).toContain('🎯 Meta creada exitosamente');
            expect(result).toContain('📝 Nombre: Emergency Fund');
            expect(result).toContain('💰 Objetivo: $10,000.00');
            expect(result).toContain('📅 Fecha límite: 31 Dic 2026');
            expect(result).toContain('¡Mucho éxito alcanzando tu meta! 🚀');
        });
    });
});
