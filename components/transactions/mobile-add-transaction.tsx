'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  DollarSign,
  FileText,
  Tag,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  Package,
  X,
  Wallet,
  Repeat,
  Settings,
  AlertTriangle,
  Calendar,
  Receipt,
} from 'lucide-react';
import { useModal } from '@/hooks';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import {
  useTransactionForm,
  TRANSACTION_TYPES,
  TRANSFER_FLOW_PATH,
} from '@/hooks/use-transaction-form';
import { DebtDirection, DebtStatus, TransactionType } from '@/types';
import type { CategoryKind } from '@/types/domain';
import { CategoryForm } from '@/components/forms/category-form';
import { CURRENCIES, fromMinorUnits } from '@/lib/money';
import { ReceiptScannerDropzone } from '@/components/receipts';
import type { ScannedReceiptResult } from '@/lib/ai/receipt-scanner/types';

// * Icon mapping for transaction types
const TYPE_ICONS = {
  EXPENSE: Minus,
  INCOME: Plus,
  TRANSFER_OUT: Repeat,
};

export function MobileAddTransaction() {
  const router = useRouter();
  const { transactions: userTransactions } = useOptimizedData();
  const {
    isOpen: isCategoryModalOpen,
    openModal: openCategoryModal,
    closeModal: closeCategoryModal,
  } = useModal();

  const [scannedResult, setScannedResult] =
    useState<ScannedReceiptResult | null>(null);
  const [isDetailedFormOpen, setIsDetailedFormOpen] = useState(false);

  // * Use custom hook for all form logic
  const {
    formData,
    setFormData,
    calculatorValue,
    loading,
    categories,
    accounts,
    loadingCategories,
    loadingAccounts,
    activeUsdVes,
    selectedRateSource,
    handleCalculatorClick,
    handleCalculatorInputChange,
    handleCategorySaved,
    handleSubmit,
    getCategoriesByType,
    getCategoryKindForTransaction,
    getSelectedAccount,
    canShowDebtFields,
  } = useTransactionForm();

  const mapKeyboardKeyToCalculatorButton = (key: string): string | null => {
    if (/^[0-9]$/.test(key)) return key;
    if (key === '.') return '.';
    if (key === '+' || key === '-' || key === '*' || key === '/') return key;
    if (key === 'Enter') return '=';
    if (key === 'Backspace') return '⌫';
    if (key === 'Delete' || key === 'Escape') return 'C';
    return null;
  };

  const handleReceiptScanSuccess = (result: ScannedReceiptResult) => {
    setScannedResult(result);
    setIsDetailedFormOpen(false);

    setFormData((prev) => {
      let nextType = prev.type;
      if (result.type === 'EXPENSE') nextType = TransactionType.EXPENSE;
      if (result.type === 'INCOME') nextType = TransactionType.INCOME;

      let matchedCategoryId = prev.categoryId;
      if (
        result.suggestedCategoryId &&
        categories.some((c) => c.id === result.suggestedCategoryId)
      ) {
        matchedCategoryId = result.suggestedCategoryId;
      } else if (result.suggestedCategoryName) {
        const norm = result.suggestedCategoryName.toLowerCase();
        const targetKind =
          nextType === TransactionType.INCOME ? 'INCOME' : 'EXPENSE';
        const found = categories.find(
          (c) =>
            c.kind === targetKind &&
            (c.name.toLowerCase().includes(norm) ||
              norm.includes(c.name.toLowerCase()))
        );
        if (found) matchedCategoryId = found.id;
      }

      let updatedNote = prev.note;
      if (result.formattedNotes) {
        updatedNote = updatedNote
          ? `${result.formattedNotes}\n\n${updatedNote}`
          : result.formattedNotes;
      }

      return {
        ...prev,
        type: nextType,
        amount: result.amount ? result.amount.toString() : prev.amount,
        date: result.date || prev.date,
        accountId: result.suggestedAccountId || prev.accountId,
        categoryId: matchedCategoryId,
        description: prev.description || result.suggestedDescription || '',
        note: updatedNote,
        tags:
          result.tags && result.tags.length > 0
            ? result.tags.join(', ')
            : prev.tags,
      };
    });

    if (result.amount) {
      handleCalculatorInputChange(result.amount.toString());
    }
  };

  const renderContent = () => {
    const isScanFastTrack = Boolean(scannedResult) && !isDetailedFormOpen;
    const selectedAccount = getSelectedAccount();

    return (
      <>
        {/* Receipt Scanner AI Dropzone */}
        <div className="mb-4">
          <ReceiptScannerDropzone
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              currencyCode: a.currencyCode,
              type: a.type,
            }))}
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              kind: (c.kind === 'INCOME' ? 'INCOME' : 'EXPENSE') as
                'INCOME' | 'EXPENSE',
              icon: c.icon,
            }))}
            existingTransactions={userTransactions}
            expectedType={
              formData.type === 'INCOME'
                ? 'INCOME'
                : formData.type === 'EXPENSE'
                  ? 'EXPENSE'
                  : undefined
            }
            onScanSuccess={handleReceiptScanSuccess}
            onReset={() => {
              setScannedResult(null);
              setIsDetailedFormOpen(false);
            }}
            onTransferRedirect={(result) => {
              const query = new URLSearchParams({
                amount: result.amount ? result.amount.toString() : '',
                targetAmount: result.targetAmount
                  ? result.targetAmount.toString()
                  : '',
                fromAccountId: result.suggestedAccountId || '',
                toAccountId: result.suggestedToAccountId || '',
                exchangeRate: result.exchangeRate
                  ? result.exchangeRate.toString()
                  : '',
                rateSource: 'Custom',
                referenceNumber: result.referenceId || '',
                description: result.suggestedDescription || '',
                date: result.date || new Date().toISOString().split('T')[0],
                notes: result.formattedNotes || '',
                commission:
                  result.fee !== undefined && result.fee > 0
                    ? result.fee.toString()
                    : '',
              });
              router.replace(`${TRANSFER_FLOW_PATH}?${query.toString()}`);
            }}
          />
        </div>

        {/* Scan-to-Confirm Fast Track Card */}
        {isScanFastTrack && scannedResult && (
          <div
            data-testid="scan-to-confirm-card"
            className="animate-in fade-in space-y-4 rounded-2xl border border-primary/40 bg-card/90 p-5 shadow-2xl backdrop-blur-xl duration-200"
          >
            {/* Header badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmación Rápida</span>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  formData.type === 'INCOME'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {formData.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
              </span>
            </div>

            {/* Big Amount Display */}
            <div className="rounded-xl border border-border/50 bg-muted/20 py-3 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monto Detectado
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-1.5 text-3xl font-extrabold text-foreground">
                <span className="font-bold text-primary">
                  {selectedAccount?.currencyCode === 'VES'
                    ? 'Bs.'
                    : CURRENCIES[
                        selectedAccount?.currencyCode ||
                          scannedResult.currency ||
                          'USD'
                      ]?.symbol || '$'}
                </span>
                <span>{formData.amount || calculatorValue || '0.00'}</span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {selectedAccount?.currencyCode ||
                    scannedResult.currency ||
                    'USD'}
                </span>
              </div>

              {(() => {
                const currencyCode =
                  selectedAccount?.currencyCode ||
                  scannedResult.currency ||
                  'USD';
                const amt = parseFloat(
                  formData.amount || calculatorValue || '0'
                );
                if (!isFinite(amt) || amt <= 0) return null;
                if (currencyCode === 'VES' && activeUsdVes > 0) {
                  const usd = amt / activeUsdVes;
                  return (
                    <div className="mt-1 text-xs text-muted-foreground">
                      ≈ $
                      {usd.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      USD · {selectedRateSource.toUpperCase()}
                    </div>
                  );
                }
                if (currencyCode === 'USD' && activeUsdVes > 0) {
                  const ves = amt * activeUsdVes;
                  return (
                    <div className="mt-1 text-xs text-muted-foreground">
                      ≈ Bs.{' '}
                      {ves.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      · {selectedRateSource.toUpperCase()}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Merchant / Description inline edit */}
            <div className="space-y-1.5">
              <label
                htmlFor="scan-confirm-desc"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                <span>Comercio o Concepto</span>
              </label>
              <input
                id="scan-confirm-desc"
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Nombre del comercio o concepto"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground placeholder-muted-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Account & Category selectors */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Account Select */}
              <div className="space-y-1.5">
                <label
                  htmlFor="scan-confirm-account"
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    Cuenta{' '}
                    {!formData.accountId && (
                      <span className="font-bold text-amber-400">*</span>
                    )}
                  </span>
                </label>
                <select
                  id="scan-confirm-account"
                  value={formData.accountId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      accountId: e.target.value,
                    }))
                  }
                  className={`w-full rounded-xl border px-3 py-2.5 text-xs font-medium outline-none transition-colors sm:text-sm ${
                    !formData.accountId
                      ? 'border-amber-500/80 bg-amber-500/10 text-amber-200 focus:border-amber-400'
                      : 'border-border bg-background text-foreground focus:border-primary'
                  }`}
                >
                  <option value="" className="bg-card text-muted-foreground">
                    -- Selecciona cuenta --
                  </option>
                  {accounts.map((acc) => (
                    <option
                      key={acc.id}
                      value={acc.id}
                      className="bg-card text-foreground"
                    >
                      {acc.name} ({acc.currencyCode})
                    </option>
                  ))}
                </select>
                {!formData.accountId && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Selecciona la cuenta de cargo
                  </p>
                )}
              </div>

              {/* Category Select */}
              <div className="space-y-1.5">
                <label
                  htmlFor="mobile-scan-category"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Categoría sugerida
                </label>
                <select
                  id="mobile-scan-category"
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full rounded-xl border border-border/70 bg-card/80 px-3 py-2.5 text-sm font-medium text-foreground backdrop-blur-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="" className="bg-card text-foreground">
                    Seleccionar categoría
                  </option>
                  {categories.map((cat) => (
                    <option
                      key={cat.id}
                      value={cat.id}
                      className="bg-card text-foreground"
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Badges: Date, Reference, Line Items */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {formData.date && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 font-mono text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formData.date}
                </span>
              )}
              {scannedResult.referenceId && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 font-mono text-xs text-muted-foreground">
                  Ref: #{scannedResult.referenceId}
                </span>
              )}
              {scannedResult.items && scannedResult.items.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {scannedResult.items.length}{' '}
                  {scannedResult.items.length === 1 ? 'artículo' : 'artículos'}
                </span>
              )}
              {scannedResult.taxAmount !== undefined &&
                scannedResult.taxAmount !== null && (
                  <span
                    data-testid="fast-track-tax-badge"
                    className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 font-mono text-xs text-muted-foreground"
                  >
                    <Receipt className="h-3 w-3 text-primary" />
                    IVA
                    {scannedResult.taxRate
                      ? ` (${scannedResult.taxRate}%)`
                      : ''}
                    : {scannedResult.taxAmount.toFixed(2)}{' '}
                    {scannedResult.currency}
                  </span>
                )}
            </div>

            {/* Primary & Secondary Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !formData.accountId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-success/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Confirmar y Guardar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsDetailedFormOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Editar detalles avanzados (Notas, Deudas...)</span>
              </button>
            </div>
          </div>
        )}

        {/* If in detailed mode with a scanned receipt, show return to fast track banner */}
        {Boolean(scannedResult) && isDetailedFormOpen && (
          <div className="animate-in fade-in flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Modo detallado activo</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailedFormOpen(false)}
              className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Volver a Confirmación Rápida
            </button>
          </div>
        )}

        {/* Manual Detailed Form: collapsed during fast-track */}
        {(!scannedResult || isDetailedFormOpen) && (
          <>
            {/* Transaction Type */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-white">
                <Repeat
                  className="mr-2 h-5 w-5 text-blue-400"
                  aria-hidden="true"
                />
                Tipo de Transacción
              </h3>
              <div className="space-y-3">
                {TRANSACTION_TYPES.map((type) => {
                  const Icon =
                    TYPE_ICONS[type.value as keyof typeof TYPE_ICONS];
                  const isSelected = formData.type === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          type: type.value as TransactionType,
                        }))
                      }
                      className={`w-full transform rounded-xl p-4 transition-all duration-300 ${
                        isSelected
                          ? `bg-gradient-to-r ${type.color} border-0 shadow-xl`
                          : 'border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            isSelected ? 'bg-white/20' : 'bg-white/10'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-300'}`}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="text-left">
                          <p
                            className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}
                          >
                            {type.label}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account Selection */}
            {formData.type && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
                <h3 className="mb-4 flex items-center text-xl font-semibold text-white">
                  <Wallet
                    className="mr-2 h-5 w-5 text-green-400"
                    aria-hidden="true"
                  />
                  Cuenta
                </h3>
                <div className="space-y-3">
                  {loadingAccounts ? (
                    <div className="text-center text-gray-400">
                      Cargando cuentas…
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="text-center text-gray-400">
                      No tienes cuentas disponibles. <br />
                      <span className="text-sm">Crea una cuenta primero.</span>
                    </div>
                  ) : (
                    accounts.map((account) => {
                      const isSelected = formData.accountId === account.id;

                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, accountId: account.id })
                          }
                          className={`w-full transform rounded-xl p-4 transition-all duration-300 ${
                            isSelected
                              ? 'border border-success/40 bg-success/90 shadow-xl'
                              : 'border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                isSelected ? 'bg-white/20' : 'bg-white/10'
                              }`}
                            >
                              <Wallet className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <p
                                className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}
                              >
                                {account.name}
                              </p>
                              <p className="amount-emphasis-white text-sm text-white">
                                {account.currencyCode === 'VES'
                                  ? `Bs. ${Math.abs(fromMinorUnits(account.balance, account.currencyCode)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                  : `$${Math.abs(fromMinorUnits(account.balance, account.currencyCode)).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${account.currencyCode}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Category Selection */}
            {formData.type && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center text-xl font-semibold text-white">
                    <Tag
                      className="mr-2 h-5 w-5 text-pink-400"
                      aria-hidden="true"
                    />
                    Categoría
                  </h3>
                  <button
                    type="button"
                    onClick={openCategoryModal}
                    className="flex items-center space-x-1 rounded-lg border border-primary bg-primary/10 px-2 py-1 text-xs text-primary transition-colors hover:border-blue-400 hover:bg-primary/20 hover:text-blue-300"
                  >
                    <Plus
                      className="h-3 w-3 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="whitespace-nowrap">Nueva</span>
                  </button>
                </div>
                <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto">
                  {loadingCategories ? (
                    <div className="col-span-full text-center text-gray-400">
                      Cargando categorías…
                    </div>
                  ) : (
                    getCategoriesByType(formData.type as TransactionType)?.map(
                      (category) => {
                        const isSelected = formData.categoryId === category.id;

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              const newData = {
                                ...formData,
                                categoryId: category.id,
                              };
                              if (category.name === 'Suscripciones') {
                                newData.isRecurring = true;
                                newData.frequency = 'monthly';
                              }
                              setFormData(newData);
                            }}
                            className={`relative rounded-xl p-3 transition-all duration-300 ${
                              isSelected
                                ? 'border-0 shadow-xl'
                                : 'border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10'
                            }`}
                            style={
                              isSelected
                                ? { backgroundColor: category.color }
                                : {}
                            }
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                  isSelected ? 'bg-white/20' : 'bg-white/10'
                                }`}
                              >
                                <Tag className="h-4 w-4 text-white" />
                              </div>
                              <span
                                className={`text-center text-xs font-medium ${
                                  isSelected ? 'text-white' : 'text-gray-300'
                                }`}
                              >
                                {category.name}
                              </span>
                            </div>
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            )}

            {/* Visual Calculator */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-white">
                <DollarSign
                  className="mr-2 h-5 w-5 text-yellow-400"
                  aria-hidden="true"
                />
                Monto
              </h3>

              <div className="mb-4 rounded-xl bg-muted/20 p-4">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-2xl font-bold">
                    <span className="amount-emphasis-white">
                      {(() => {
                        const selectedAccount = getSelectedAccount();
                        const currencyCode =
                          selectedAccount?.currencyCode || 'USD';
                        const currency = CURRENCIES[currencyCode];
                        return currency?.symbol || '$';
                      })()}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={calculatorValue}
                      onChange={(e) =>
                        handleCalculatorInputChange(e.target.value)
                      }
                      onKeyDown={(e) => {
                        const mappedButton = mapKeyboardKeyToCalculatorButton(
                          e.key
                        );
                        if (!mappedButton) return;

                        if (mappedButton === '=' || mappedButton === 'C') {
                          e.preventDefault();
                          handleCalculatorClick(mappedButton);
                        }
                      }}
                      className="amount-emphasis-white w-full max-w-48 bg-transparent text-right outline-none"
                      aria-label="Monto de la transacción"
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-white/70">
                    {(() => {
                      const selectedAccount = getSelectedAccount();
                      const currencyCode =
                        selectedAccount?.currencyCode || 'USD';
                      const amt = parseFloat(calculatorValue || '0');
                      if (!isFinite(amt) || amt <= 0) return null;
                      if (currencyCode === 'VES') {
                        const usd = activeUsdVes > 0 ? amt / activeUsdVes : 0;
                        return `≈ $${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD · ${selectedRateSource.toUpperCase()}`;
                      }
                      if (currencyCode === 'USD') {
                        const ves = activeUsdVes > 0 ? amt * activeUsdVes : 0;
                        return `≈ Bs. ${ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })} · ${selectedRateSource.toUpperCase()}`;
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  'C',
                  '⌫',
                  '/',
                  '*',
                  '7',
                  '8',
                  '9',
                  '-',
                  '4',
                  '5',
                  '6',
                  '+',
                  '1',
                  '2',
                  '3',
                  '=',
                  '0',
                  '.',
                ].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    aria-label={
                      btn === 'C'
                        ? 'Limpiar'
                        : btn === '⌫'
                          ? 'Borrar'
                          : btn === '/'
                            ? 'Dividir'
                            : btn === '*'
                              ? 'Multiplicar'
                              : btn === '-'
                                ? 'Restar'
                                : btn === '+'
                                  ? 'Sumar'
                                  : btn === '='
                                    ? 'Calcular resultado'
                                    : btn === '.'
                                      ? 'Punto decimal'
                                      : `Número ${btn}`
                    }
                    onClick={() => handleCalculatorClick(btn)}
                    className={`h-12 rounded-lg font-semibold transition-all duration-200 ${
                      ['C', '⌫'].includes(btn)
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : ['/', '*', '-', '+', '='].includes(btn)
                          ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                          : 'bg-white/10 text-white hover:bg-white/20'
                    } ${btn === '0' ? 'col-span-2' : ''}`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-white">
                <FileText
                  className="mr-2 h-5 w-5 text-cyan-400"
                  aria-hidden="true"
                />
                Detalles
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="mobile-description"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Descripción (Opcional)
                  </label>
                  <input
                    id="mobile-description"
                    type="text"
                    placeholder={
                      formData.type === 'INCOME'
                        ? '¿De dónde viene este ingreso?'
                        : formData.type === 'TRANSFER_OUT'
                          ? '¿Para qué es esta transferencia?'
                          : '¿Para qué fue este gasto?'
                    }
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mobile-date"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Fecha
                  </label>
                  <input
                    id="mobile-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mobile-note"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Nota (Opcional)
                  </label>
                  <textarea
                    id="mobile-note"
                    placeholder="Información adicional…"
                    value={formData.note}
                    onChange={(e) =>
                      setFormData({ ...formData, note: e.target.value })
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mobile-tags"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Etiquetas (Opcional)
                  </label>
                  <input
                    id="mobile-tags"
                    type="text"
                    placeholder="urgente, recurrente, etc."
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {canShowDebtFields && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <label
                        htmlFor="isDebt"
                        className="text-sm font-medium text-white"
                      >
                        Es deuda
                      </label>
                      <input
                        id="isDebt"
                        type="checkbox"
                        checked={formData.isDebt}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isDebt: e.target.checked,
                            debtDirection: e.target.checked
                              ? formData.debtDirection
                              : '',
                            debtStatus: e.target.checked
                              ? formData.debtStatus
                              : DebtStatus.OPEN,
                            counterpartyName: e.target.checked
                              ? formData.counterpartyName
                              : '',
                            settledAt: e.target.checked
                              ? formData.settledAt
                              : '',
                          })
                        }
                        className="h-5 w-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    {formData.isDebt && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300">
                          <span className="font-semibold text-blue-200">
                            Sin impacto en saldo:
                          </span>{' '}
                          Esta deuda registrará el compromiso sin sumar ni
                          restar dinero a tu saldo de cuenta hasta que la
                          saldes.
                        </div>
                        <div>
                          <label
                            htmlFor="mobile-debt-direction"
                            className="mb-2 block text-sm font-medium text-gray-300"
                          >
                            Direccion de deuda
                          </label>
                          <select
                            id="mobile-debt-direction"
                            value={formData.debtDirection}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                debtDirection: e.target.value as DebtDirection,
                              })
                            }
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="" className="bg-gray-800">
                              Selecciona una opcion
                            </option>
                            <option value="OWE" className="bg-gray-800">
                              Debo
                            </option>
                            <option value="OWED_TO_ME" className="bg-gray-800">
                              Me deben
                            </option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="mobile-debt-status"
                            className="mb-2 block text-sm font-medium text-gray-300"
                          >
                            Estado
                          </label>
                          <select
                            id="mobile-debt-status"
                            value={formData.debtStatus}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                debtStatus: e.target.value as DebtStatus,
                                settledAt:
                                  e.target.value === DebtStatus.SETTLED
                                    ? formData.settledAt
                                    : '',
                              })
                            }
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option
                              value={DebtStatus.OPEN}
                              className="bg-gray-800"
                            >
                              Abierta
                            </option>
                            <option
                              value={DebtStatus.SETTLED}
                              className="bg-gray-800"
                            >
                              Saldada
                            </option>
                          </select>
                        </div>

                        {formData.debtStatus === DebtStatus.SETTLED && (
                          <div>
                            <label
                              htmlFor="mobile-debt-settled-at"
                              className="mb-2 block text-sm font-medium text-gray-300"
                            >
                              Fecha de liquidacion
                            </label>
                            <input
                              id="mobile-debt-settled-at"
                              type="date"
                              value={formData.settledAt}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  settledAt: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                            />
                          </div>
                        )}

                        <div>
                          <label
                            htmlFor="mobile-debt-counterparty"
                            className="mb-2 block text-sm font-medium text-gray-300"
                          >
                            Contraparte (opcional)
                          </label>
                          <input
                            id="mobile-debt-counterparty"
                            type="text"
                            placeholder="Nombre de la persona o empresa"
                            value={formData.counterpartyName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                counterpartyName: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recurring Transaction Settings */}
                <div className="border-t border-white/10 pt-4">
                  <div className="mb-4 flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isRecurring: e.target.checked,
                        })
                      }
                      className="h-5 w-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                    />
                    <label
                      htmlFor="isRecurring"
                      className="font-medium text-white"
                    >
                      Transacción Recurrente
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div className="space-y-4 pl-8">
                      <div>
                        <label
                          htmlFor="mobile-recurring-frequency"
                          className="mb-2 block text-sm font-medium text-gray-300"
                        >
                          Frecuencia
                        </label>
                        <select
                          id="mobile-recurring-frequency"
                          value={formData.frequency}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              frequency: e.target.value as
                                'weekly' | 'monthly' | 'yearly',
                            })
                          }
                          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="weekly" className="bg-gray-800">
                            Semanal
                          </option>
                          <option value="monthly" className="bg-gray-800">
                            Mensual
                          </option>
                          <option value="yearly" className="bg-gray-800">
                            Anual
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="mobile-recurring-end-date"
                          className="mb-2 block text-sm font-medium text-gray-300"
                        >
                          Finalizar el (Opcional)
                        </label>
                        <input
                          id="mobile-recurring-end-date"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              endDate: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Deja vacío para que continúe indefinidamente
                        </p>
                      </div>

                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                        <p className="text-sm text-blue-300">
                          Esta transacción se repetirá automáticamente cada{' '}
                          {formData.frequency === 'weekly'
                            ? 'semana'
                            : formData.frequency === 'monthly'
                              ? 'mes'
                              : 'año'}{' '}
                          hasta que la canceles.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <div className="min-h-dynamic-screen overflow-y-auto bg-background p-4 pt-safe-top">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="focus-ring flex min-h-[44px] items-center space-x-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2 text-foreground backdrop-blur-md transition-all duration-300 hover:bg-card/60"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          <span>Volver</span>
        </button>

        <h1 className="text-center text-2xl font-bold text-foreground">
          Nueva Transacción
        </h1>

        <div className="w-20"></div>
      </div>

      {/* Content in mobile-friendly single column */}
      <div className="space-y-6 pb-32">{renderContent()}</div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring flex min-h-[44px] flex-1 items-center justify-center space-x-2 rounded-xl border border-border/60 bg-muted/30 px-6 py-3 font-medium text-foreground backdrop-blur-md transition-colors hover:bg-muted/50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              loading || (Boolean(scannedResult) && !formData.accountId)
            }
            className="focus-ring flex min-h-[44px] flex-1 items-center justify-center space-x-2 rounded-xl bg-success px-6 py-3 font-medium text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-5 w-5" aria-hidden="true" />
                <span>
                  {scannedResult && !isDetailedFormOpen
                    ? 'Confirmar y Guardar'
                    : 'Finalizar'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Category Creation Modal */}
      <CategoryForm
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        onSave={handleCategorySaved}
        category={null}
        parentCategoryId={null}
        defaultKind={getCategoryKindForTransaction() as CategoryKind}
      />
    </div>
  );
}
