import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionFilters } from '@/components/filters/transaction-filters';
import { useOptimizedData } from '@/hooks/use-optimized-data';

// Mock dependencies
jest.mock('@/hooks/use-optimized-data', () => ({
    useOptimizedData: jest.fn(),
}));

// Mock Select and Input components if necessary, 
// but we want to test the full integration of TransactionFilters
// unless they cause issues in the test environment.

describe('TransactionFilters', () => {
    const mockOnFiltersChange = jest.fn();
    const mockAccounts = [
        { id: 'acc1', name: 'Cuenta 1' },
        { id: 'acc2', name: 'Cuenta 2' },
    ];
    const mockCategories = [
        { id: 'cat1', name: 'Comida', kind: 'EXPENSE' },
        { id: 'cat2', name: 'Sueldo', kind: 'INCOME' },
    ];

    beforeEach(() => {
        (useOptimizedData as jest.Mock).mockReturnValue({
            accounts: mockAccounts,
            categories: mockCategories,
            getCategoryName: jest.fn((id) => mockCategories.find(c => c.id === id)?.name || id),
            getAccountName: jest.fn((id) => mockAccounts.find(a => a.id === id)?.name || id),
        });
        mockOnFiltersChange.mockClear();
    });

    it('renders initial state correctly', () => {
        render(<TransactionFilters onFiltersChange={mockOnFiltersChange} />);

        // Quick filters should be visible
        expect(screen.getByText('Todos los tipos')).toBeInTheDocument();
        expect(screen.getByText('Mostrar Filtros')).toBeInTheDocument();
    });

    it('calls onFiltersChange when transaction type is changed', () => {
        render(<TransactionFilters onFiltersChange={mockOnFiltersChange} />);

        const typeSelect = screen.getByDisplayValue('Todos los tipos');
        fireEvent.change(typeSelect, { target: { value: 'EXPENSE' } });

        expect(mockOnFiltersChange).toHaveBeenCalledWith(expect.objectContaining({
            type: 'EXPENSE'
        }));
    });

    it('expands more filters when clicking toggle button', () => {
        render(<TransactionFilters onFiltersChange={mockOnFiltersChange} />);

        const toggleButton = screen.getByText('Mostrar Filtros');
        fireEvent.click(toggleButton);

        expect(screen.getByText('Ocultar Filtros')).toBeInTheDocument();
        expect(screen.getByText('Cuenta')).toBeInTheDocument();
        expect(screen.getByText('Categoría')).toBeInTheDocument();
    });

    it('clears filters when clear button is clicked', () => {
        render(<TransactionFilters onFiltersChange={mockOnFiltersChange} />);

        // Apply a filter first
        const typeSelect = screen.getByDisplayValue('Todos los tipos');
        fireEvent.change(typeSelect, { target: { value: 'EXPENSE' } });

        // Clear button should appear
        const clearButton = screen.getByText('Limpiar');
        fireEvent.click(clearButton);

        expect(mockOnFiltersChange).toHaveBeenCalledWith(expect.objectContaining({
            type: ''
        }));
        expect(typeSelect).toHaveValue('');
    });
});
