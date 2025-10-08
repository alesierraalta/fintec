'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type VisibilityState,
  type GroupingState,
  type ExpandedState,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  Filter,
  Search,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Tag,
  DollarSign,
} from 'lucide-react';
import { dateUtils } from '@/lib/dates/dayjs';
import { cardVariants, listItemVariants, staggerContainer } from '@/lib/animations';
import { useTableShortcuts } from '@/lib/hotkeys';
import { useNotifications } from '@/lib/store';
import { TransactionType } from '@/lib/validations/schemas';

// Mock transaction data type
interface Transaction {
  id: string;
  type: TransactionType;
  accountId: string;
  categoryId: string;
  currencyCode: string;
  amountMinor: number;
  description: string;
  date: string;
  note?: string;
  tags?: string[];
  account: {
    name: string;
    type: string;
  };
  category: {
    name: string;
    color: string;
    icon: string;
  };
  createdAt: string;
}

interface TransactionsTableProps {
  data: Transaction[];
  loading?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  onDuplicate?: (transaction: Transaction) => void;
  onExport?: () => void;
}

export function TransactionsTable({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
}: TransactionsTableProps) {
  const { addNotification } = useNotifications();

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Memoized columns definition
  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => {
          const type = row.original.type as unknown as string;
          const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
            INCOME: { label: 'Ingreso', color: 'text-green-600 bg-green-50', icon: '💰' },
            EXPENSE: { label: 'Gasto', color: 'text-red-600 bg-red-50', icon: '💸' },
            TRANSFER_OUT: { label: 'Transferencia', color: 'text-blue-600 bg-blue-50', icon: '🔄' },
            TRANSFER_IN: { label: 'Transferencia', color: 'text-blue-600 bg-blue-50', icon: '🔄' },
          };
          const config = typeConfig[type] || typeConfig.EXPENSE;
          
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </span>
          );
        },
        filterFn: 'equals',
        size: 120,
      },
      {
        accessorKey: 'description',
        header: 'Descripción',
        cell: ({ getValue, row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {getValue() as string}
            </p>
            {row.original.note && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-1">
                {row.original.note}
              </p>
            )}
          </div>
        ),
        size: 200,
      },
      {
        accessorKey: 'amountMinor',
        header: ({ column }) => (
          <button
            className="flex items-center space-x-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <DollarSign className="h-4 w-4" />
            <span>Monto</span>
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ getValue, row }) => {
          const amountMinor = getValue() as number;
          const currencyCode = row.original.currencyCode || 'USD';
          const type = row.original.type as unknown as string;
          const isNegative = type === 'EXPENSE' || type === 'TRANSFER_OUT';
          
          // Convert from minor units (cents) to major units (dollars)
          // Handle NaN, null, undefined values
          const amount = amountMinor && !isNaN(amountMinor) && isFinite(amountMinor)
            ? amountMinor / 100
            : 0;
          
          return (
            <span className={`font-mono font-semibold ${
              isNegative ? 'text-red-600' : 'text-green-600'
            }`}>
              {isNegative ? '-' : '+'}${Math.abs(amount).toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          );
        },
        sortingFn: 'basic',
        size: 120,
      },
      {
        accessorKey: 'account.name',
        id: 'account',
        header: 'Cuenta',
        cell: ({ row }) => (
          <div className="text-sm">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{row.original.account.name}</p>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs">{row.original.account.type}</p>
          </div>
        ),
        size: 150,
      },
      {
        accessorKey: 'category.name',
        id: 'category',
        header: 'Categoría',
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: row.original.category.color }}
            />
            <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
              {row.original.category.name}
            </span>
          </div>
        ),
        size: 130,
      },
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <button
            className="flex items-center space-x-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <Calendar className="h-4 w-4" />
            <span>Fecha</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4" />
            )}
          </button>
        ),
        cell: ({ getValue }) => {
          const date = getValue() as string;
          return (
            <div className="text-sm">
              <p className="text-neutral-900 dark:text-neutral-100">{dateUtils.formatForDisplay(date)}</p>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs">{dateUtils.fromNow(date)}</p>
            </div>
          );
        },
        sortingFn: 'datetime',
        size: 120,
      },
      {
        accessorKey: 'tags',
        header: 'Etiquetas',
        cell: ({ getValue }) => {
          const tags = getValue() as string[] | undefined;
          if (!tags || tags.length === 0) return null;
          
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">+{tags.length - 2}</span>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 150,
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onEdit?.(row.original)}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400"
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDuplicate?.(row.original)}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400 hover:text-success-600 dark:hover:text-success-400"
              title="Duplicar"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete?.(row.original.id)}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400 hover:text-error-600 dark:hover:text-error-400"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 100,
      },
    ],
    [onEdit, onDuplicate, onDelete]
  );

  // Table instance
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      grouping,
      expanded,
      globalFilter,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    globalFilterFn: 'includesString',
  });

  // Keyboard shortcuts for table navigation
  useTableShortcuts(
    () => table.nextPage(),
    () => table.previousPage(),
    () => table.setPageIndex(0),
    () => table.setPageIndex(table.getPageCount() - 1)
  );

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar transacciones..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>
          
          <button
            onClick={() => {
              // Open filters modal
              addNotification({
                type: 'info',
                title: 'Filtros',
                message: 'Panel de filtros próximamente',
                read: false,
              });
            }}
            className="inline-flex items-center px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {selectedRows.length > 0 && (
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {selectedRows.length} seleccionadas
            </span>
          )}
          
          <button
            onClick={onExport}
            className="inline-flex items-center px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>

          <div className="relative">
            <button className="inline-flex items-center px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700">
              <Eye className="h-4 w-4 mr-2" />
              Columnas
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-card/60 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            {/* Header */}
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Body */}
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
              <AnimatePresence>
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-400"></div>
                        <span>Cargando transacciones...</span>
                      </div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      <div className="text-center">
                        <DollarSign className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500" />
                        <h3 className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          No hay transacciones
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                          Comienza agregando tu primera transacción.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      whileHover="hover"
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-6 py-4 whitespace-nowrap"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && table.getRowModel().rows.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 px-4 py-3 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="relative inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-sm font-medium rounded-md text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-sm font-medium rounded-md text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Mostrando{' '}
                  <span className="font-medium">
                    {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                      table.getFilteredRowModel().rows.length
                    )}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium">
                    {table.getFilteredRowModel().rows.length}
                  </span>{' '}
                  resultados
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Página {table.getState().pagination.pageIndex + 1} de{' '}
                  {table.getPageCount()}
                </span>
                
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-2 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="p-2 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
