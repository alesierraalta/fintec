/**
 * Tests para las mejoras del Agente IA
 * 
 * Cubre:
 * - Ejecución paralela
 * - Replanificación automática
 * - Sistema de confianza gradual
 * - Caché de contexto
 * - RAG optimizado
 */

import { getCachedContext, setCachedContext, invalidateCachedContext, clearAllCache } from '../context-cache';
import type { WalletContext } from '../context-builder';

// Mock data
const mockUserId = 'test-user-123';
const mockContext: WalletContext = {
    accounts: {
        total: 2,
        summary: [
            { name: 'Checking', type: 'CHECKING', balance: 1000, currency: 'USD' },
            { name: 'Savings', type: 'SAVINGS', balance: 5000, currency: 'USD' },
        ],
        totalBalance: { USD: 6000 },
    },
    transactions: {
        recent: [
            { date: '2025-12-01', type: 'EXPENSE', amount: 50, category: 'Food', currencyCode: 'USD' },
            { date: '2025-12-02', type: 'INCOME', amount: 2000, category: 'Salary', currencyCode: 'USD' },
        ],
        summary: {
            incomeThisMonth: 2000,
            expensesThisMonth: 50,
            netThisMonth: 1950,
            topCategories: [{ category: 'Food', amount: 50, count: 1 }],
        },
    },
    budgets: {
        active: [{ category: 'Food', budget: 500, spent: 50, remaining: 450, percentage: 10 }],
    },
    goals: {
        active: [{ name: 'Emergency Fund', target: 10000, current: 5000, progress: 50 }],
    },
};

describe('Fase 3: Caché de Contexto', () => {
    beforeEach(() => {
        clearAllCache();
    });

    test('debe cachear el contexto correctamente', () => {
        setCachedContext(mockUserId, mockContext);
        const cached = getCachedContext(mockUserId);

        expect(cached).toEqual(mockContext);
    });

    test('debe retornar null si el caché expiró', () => {
        setCachedContext(mockUserId, mockContext);

        // Simular paso del tiempo (5 minutos + 1 segundo)
        jest.useFakeTimers();
        jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

        const cached = getCachedContext(mockUserId);

        expect(cached).toBeNull();

        jest.useRealTimers();
    });

    test('debe invalidar caché específico de usuario', () => {
        setCachedContext(mockUserId, mockContext);
        setCachedContext('other-user', mockContext);

        invalidateCachedContext(mockUserId);

        expect(getCachedContext(mockUserId)).toBeNull();
        expect(getCachedContext('other-user')).toEqual(mockContext);
    });

    test('debe limpiar todo el caché', () => {
        setCachedContext(mockUserId, mockContext);
        setCachedContext('other-user', mockContext);

        clearAllCache();

        expect(getCachedContext(mockUserId)).toBeNull();
        expect(getCachedContext('other-user')).toBeNull();
    });

    test('debe retornar caché válido dentro del TTL', () => {
        setCachedContext(mockUserId, mockContext);

        // Avanzar 2 minutos (dentro del TTL de 5 minutos)
        jest.useFakeTimers();
        jest.advanceTimersByTime(2 * 60 * 1000);

        const cached = getCachedContext(mockUserId);

        expect(cached).toEqual(mockContext);

        jest.useRealTimers();
    });
});

describe('Performance del Caché', () => {
    beforeEach(() => {
        clearAllCache();
    });

    test('debe ser instantáneo recuperar del caché', () => {
        setCachedContext(mockUserId, mockContext);

        const startTime = Date.now();
        const cached = getCachedContext(mockUserId);
        const duration = Date.now() - startTime;

        expect(cached).toEqual(mockContext);
        expect(duration).toBeLessThan(5); // Menos de 5ms
    });

    test('debe manejar múltiples usuarios simultáneamente', () => {
        const users = Array.from({ length: 100 }, (_, i) => `user-${i}`);

        // Cachear para todos los usuarios
        users.forEach(userId => {
            setCachedContext(userId, mockContext);
        });

        // Verificar que todos tienen caché
        users.forEach(userId => {
            const cached = getCachedContext(userId);
            expect(cached).toEqual(mockContext);
        });
    });
});
