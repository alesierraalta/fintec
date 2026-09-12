'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
} from 'react';
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  RotateCcw,
  Eye,
  X,
  Plus,
  Sparkles,
  CopyCheck,
} from 'lucide-react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { toast } from 'sonner';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useActiveUsdVesRate } from '@/lib/rates';
import { toMinorUnits } from '@/lib/money';
import { runFinancialMutation } from '@/lib/finance/financial-data-sync';
import {
  detectHistoryDuplicate,
  detectIntraBatchDuplicates,
} from '@/lib/finance/duplicate-detector';
import { compressImage } from '@/hooks/use-receipt-scanner';
import type {
  Account,
  Category,
  CreateTransactionDTO,
  Transaction,
} from '@/types';
import { TransactionType } from '@/types';
import type {
  AccountCandidate,
  ScannedReceiptResult,
  ScanReceiptResponse,
} from '@/lib/ai/receipt-scanner/types';

export const MAX_BATCH_RECEIPTS = 20;
export const CONCURRENCY_LIMIT = 2;

export interface BatchReceiptItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'scanning' | 'done' | 'error';
  error?: string;
  result?: ScannedReceiptResult;
  // Editable fields for review & fast-fill
  amount: number;
  currency: string;
  date: string;
  type: TransactionType;
  referenceId: string;
  description: string;
  categoryId: string;
  accountId: string;
  accountNeedsAttention: boolean;
  // Duplicate detection fields
  isDuplicate?: boolean;
  duplicateType?: 'INTRA_BATCH' | 'HISTORY';
  duplicateReason?: string;
  isIncluded?: boolean; // Defaults to true; false if duplicate is detected
}

export interface BatchReceiptUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accounts?: Account[];
  categories?: Category[];
  existingTransactions?: Transaction[];
}

export function findMatchingCategory(
  suggestedName: string | undefined,
  categories: Category[]
): string | undefined {
  if (!suggestedName) return undefined;
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const clean = normalize(suggestedName);

  // 1. Exact match
  const exact = categories.find((c) => normalize(c.name) === clean);
  if (exact) return exact.id;

  // 2. Contains match
  const contains = categories.find((c) => {
    const normName = normalize(c.name);
    return normName.includes(clean) || clean.includes(normName);
  });
  if (contains) return contains.id;

  // 3. Token / stem match
  const tokens = clean.split(/\s+/).filter((t) => t.length >= 4);
  const tokenMatch = categories.find((c) => {
    const normName = normalize(c.name);
    return tokens.some((tok) => {
      const stem = tok.slice(0, 5);
      return normName.includes(tok) || normName.includes(stem);
    });
  });
  if (tokenMatch) return tokenMatch.id;

  return undefined;
}

/**
 * Matches scanner result against user accounts using suggestedAccountId,
 * bank platform aliases, or single account currency match.
 */
export function findMatchingAccount(
  result: ScannedReceiptResult,
  accounts: Account[]
): string | undefined {
  // 1. If backend matched a suggestedAccountId and it exists in accounts
  if (result.suggestedAccountId) {
    const exists = accounts.find((a) => a.id === result.suggestedAccountId);
    if (exists) return exists.id;
  }

  // 2. Check candidates if bank or platform matches account name
  if (result.bankOrPlatform) {
    const bankClean = result.bankOrPlatform.toLowerCase();
    const match = accounts.find(
      (a) =>
        a.name.toLowerCase().includes(bankClean) ||
        bankClean.includes(a.name.toLowerCase())
    );
    if (match) return match.id;
  }

  // 3. If there is only one account matching the currency
  if (result.currency) {
    const currencyAccounts = accounts.filter(
      (a) => a.currencyCode.toUpperCase() === result.currency.toUpperCase()
    );
    if (currencyAccounts.length === 1) {
      return currencyAccounts[0].id;
    }
  }

  return undefined;
}

export function annotateDuplicates(
  items: BatchReceiptItem[],
  existingTransactions: Transaction[]
): BatchReceiptItem[] {
  const candidates = items.map((it) => ({
    id: it.id,
    referenceId: it.referenceId,
    amountMinor: it.amount > 0 ? toMinorUnits(it.amount, it.currency) : null,
    currencyCode: it.currency,
    date: it.date,
    accountId: it.accountId || null,
    fileName: it.file?.name,
    fileSize: it.file?.size,
  }));

  const intraBatchMap = detectIntraBatchDuplicates(candidates);

  return items.map((item) => {
    const intra = intraBatchMap.get(item.id);
    if (intra?.isDuplicate) {
      const wasDuplicate = item.isDuplicate;
      return {
        ...item,
        isDuplicate: true,
        duplicateType: 'INTRA_BATCH' as const,
        duplicateReason: intra.reason,
        isIncluded: wasDuplicate ? (item.isIncluded ?? false) : false,
      };
    }

    // Only check history for items that have finished scanning or have a reference
    if (
      item.status === 'done' ||
      (item.referenceId && item.referenceId.trim().length >= 4)
    ) {
      const hist = detectHistoryDuplicate(
        {
          referenceId: item.referenceId,
          amountMinor:
            item.amount > 0 ? toMinorUnits(item.amount, item.currency) : null,
          currencyCode: item.currency,
          date: item.date,
          accountId: item.accountId || null,
        },
        existingTransactions
      );

      if (hist.isDuplicate) {
        const wasDuplicate = item.isDuplicate;
        return {
          ...item,
          isDuplicate: true,
          duplicateType: 'HISTORY' as const,
          duplicateReason: hist.reason,
          isIncluded: wasDuplicate ? (item.isIncluded ?? false) : false,
        };
      }
    }

    // Not a duplicate
    return {
      ...item,
      isDuplicate: false,
      duplicateType: undefined,
      duplicateReason: undefined,
      isIncluded: item.isIncluded ?? true,
    };
  });
}

export function BatchReceiptUploaderModal({
  isOpen,
  onClose,
  onSuccess,
  accounts: propAccounts,
  categories: propCategories,
  existingTransactions: propExistingTransactions,
}: BatchReceiptUploaderModalProps) {
  const repository = useRepository();
  const { user } = useAuth();
  const {
    accounts: storeAccounts,
    categories: storeCategories,
    transactions: storeTransactions,
  } = useOptimizedData();
  const activeUsdVes = useActiveUsdVesRate();

  const accounts = propAccounts || storeAccounts || [];
  const categories = propCategories || storeCategories || [];
  const existingTransactions =
    propExistingTransactions || storeTransactions || [];

  const [items, setItems] = useState<BatchReceiptItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewItem, setPreviewItem] = useState<BatchReceiptItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef<BatchReceiptItem[]>([]);
  itemsRef.current = items;

  const activeWorkersCountRef = useRef(0);
  const processingIdsRef = useRef<Set<string>>(new Set());

  const rawInputId = useId();
  const fileInputId = `batch-receipt-input-${rawInputId.replace(/:/g, '')}`;

  // Cleanup object URLs on unmount or reset
  const createdUrlsRef = useRef<Set<string>>(new Set());

  const registerPreviewUrl = useCallback((url: string) => {
    createdUrlsRef.current.add(url);
  }, []);

  const revokePreviewUrl = useCallback((url: string) => {
    if (url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      createdUrlsRef.current.delete(url);
    }
  }, []);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cleanup all blob URLs on unmount
      createdUrlsRef.current.forEach((url) => {
        if (url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch {
            // ignore
          }
        }
      });
      createdUrlsRef.current.clear();
    };
  }, []);

  // Update item helper
  const updateItem = useCallback(
    (id: string, updates: Partial<BatchReceiptItem>) => {
      if (!isMountedRef.current) return;
      const next = itemsRef.current.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      const annotated = annotateDuplicates(next, existingTransactions);
      itemsRef.current = annotated;
      setItems(annotated);
    },
    [existingTransactions]
  );

  // Scan single receipt item
  const scanSingleItem = useCallback(
    async (item: BatchReceiptItem) => {
      try {
        let compressedBase64: string;
        try {
          compressedBase64 = await compressImage(item.file);
        } catch {
          compressedBase64 = item.previewUrl;
        }

        const accountCandidates: AccountCandidate[] = accounts.map((a) => ({
          id: a.id,
          name: a.name,
          currencyCode: a.currencyCode,
          type: a.type,
        }));

        const response = await fetch('/api/ai/scan-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: compressedBase64,
            accounts: accountCandidates,
          }),
        });

        let resData: ScanReceiptResponse;
        try {
          resData = await response.json();
        } catch {
          throw new Error(
            `Error en la respuesta del servidor (${response.status})`
          );
        }

        if (!response.ok || !resData?.success || !resData?.data) {
          throw new Error(
            resData?.error ||
              `No se pudo procesar el comprobante (${response.status})`
          );
        }

        const result = resData.data;
        const matchedCategory = findMatchingCategory(
          result.suggestedCategoryName,
          categories
        );
        const matchedAccount = findMatchingAccount(result, accounts);

        const detectedCurrency =
          result.currency ||
          (matchedAccount
            ? accounts.find((a) => a.id === matchedAccount)?.currencyCode
            : undefined) ||
          'VES';

        updateItem(item.id, {
          status: 'done',
          result,
          amount: result.amount || 0,
          currency: detectedCurrency,
          date: result.date || new Date().toISOString().split('T')[0],
          type:
            result.type === 'INCOME'
              ? TransactionType.INCOME
              : TransactionType.EXPENSE,
          referenceId: result.referenceId || '',
          description:
            result.suggestedDescription ||
            result.counterparty?.name ||
            result.bankOrPlatform ||
            '',
          categoryId: matchedCategory || '',
          accountId: matchedAccount || '',
          accountNeedsAttention: !matchedAccount,
        });
      } catch (err: any) {
        updateItem(item.id, {
          status: 'error',
          error: err.message || 'Error al analizar comprobante',
          accountNeedsAttention: true,
        });
      }
    },
    [accounts, categories, updateItem]
  );

  // Queue runner with bounded concurrency
  const processQueue = useCallback(() => {
    if (!isMountedRef.current) return;
    while (activeWorkersCountRef.current < CONCURRENCY_LIMIT) {
      // Find next pending item not already claimed
      const nextItem = itemsRef.current.find(
        (i) => i.status === 'pending' && !processingIdsRef.current.has(i.id)
      );

      if (!nextItem) break;

      processingIdsRef.current.add(nextItem.id);
      activeWorkersCountRef.current += 1;

      updateItem(nextItem.id, { status: 'scanning' });

      (async () => {
        try {
          await scanSingleItem(nextItem);
        } finally {
          processingIdsRef.current.delete(nextItem.id);
          activeWorkersCountRef.current -= 1;
          if (isMountedRef.current) {
            processQueue();
          }
        }
      })();
    }
  }, [scanSingleItem, updateItem]);

  // Handle incoming files
  const handleAddFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      if (fileArray.length === 0) return;

      // Filter images only
      const imageFiles = fileArray.filter((file) =>
        file.type.startsWith('image/')
      );

      if (imageFiles.length < fileArray.length) {
        toast.error('Solo se permiten archivos de imagen (JPG, PNG, WEBP).');
      }

      if (imageFiles.length === 0) return;

      const currentCount = itemsRef.current.length;
      const remainingCapacity = MAX_BATCH_RECEIPTS - currentCount;

      if (remainingCapacity <= 0) {
        toast.warning(
          `Ya has alcanzado el límite máximo de ${MAX_BATCH_RECEIPTS} comprobantes.`
        );
        return;
      }

      let filesToProcess = imageFiles;
      if (imageFiles.length > remainingCapacity) {
        toast.warning(
          `Límite de ${MAX_BATCH_RECEIPTS} comprobantes alcanzado. Se procesarán los primeros ${remainingCapacity}.`
        );
        filesToProcess = imageFiles.slice(0, remainingCapacity);
      }

      const newItems: BatchReceiptItem[] = filesToProcess.map((file, idx) => {
        const url = URL.createObjectURL(file);
        registerPreviewUrl(url);

        return {
          id: `receipt-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl: url,
          status: 'pending',
          amount: 0,
          currency: 'VES',
          date: new Date().toISOString().split('T')[0],
          type: TransactionType.EXPENSE,
          referenceId: '',
          description: '',
          categoryId: '',
          accountId: '',
          accountNeedsAttention: true,
        };
      });

      setItems((prev) => {
        const next = annotateDuplicates(
          [...prev, ...newItems],
          existingTransactions
        );
        itemsRef.current = next;
        return next;
      });

      // Reset file input value so user can reselect if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Trigger queue processing
      setTimeout(() => {
        processQueue();
      }, 0);
    },
    [existingTransactions, processQueue, registerPreviewUrl]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (item) {
        revokePreviewUrl(item.previewUrl);
        processingIdsRef.current.delete(id);
      }
      const remaining = itemsRef.current.filter((i) => i.id !== id);
      const annotated = annotateDuplicates(remaining, existingTransactions);
      itemsRef.current = annotated;
      setItems(annotated);
    },
    [existingTransactions, revokePreviewUrl]
  );

  const handleRetryItem = useCallback(
    (id: string) => {
      updateItem(id, { status: 'pending', error: undefined });
      setTimeout(() => {
        processQueue();
      }, 0);
    },
    [processQueue, updateItem]
  );

  // Field change handlers
  const handleFieldChange = useCallback(
    (id: string, field: keyof BatchReceiptItem, value: any) => {
      const updatedList = itemsRef.current.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'accountId') {
          updated.accountNeedsAttention = !value;
          // Sync currency with selected account if available
          const acc = accounts.find((a) => a.id === value);
          if (acc && !item.currency) {
            updated.currency = acc.currencyCode;
          }
        }
        return updated;
      });

      // If toggling include status directly, preserve user choice without re-annotating
      if (field === 'isIncluded') {
        itemsRef.current = updatedList;
        setItems(updatedList);
        return;
      }

      const annotated = annotateDuplicates(updatedList, existingTransactions);
      itemsRef.current = annotated;
      setItems(annotated);
    },
    [accounts, existingTransactions]
  );

  // Discard all duplicates helper
  const duplicateItems = useMemo(() => {
    return items.filter((i) => i.isDuplicate);
  }, [items]);

  const handleDiscardAllDuplicates = useCallback(() => {
    const duplicates = itemsRef.current.filter((i) => i.isDuplicate);
    if (duplicates.length === 0) return;

    duplicates.forEach((d) => {
      revokePreviewUrl(d.previewUrl);
      processingIdsRef.current.delete(d.id);
    });

    const remaining = itemsRef.current.filter((i) => !i.isDuplicate);
    const annotated = annotateDuplicates(remaining, existingTransactions);
    itemsRef.current = annotated;
    setItems(annotated);
    toast.success(
      `${duplicates.length} comprobante(s) duplicado(s) descartado(s)`
    );
  }, [existingTransactions, revokePreviewUrl]);

  // Stats calculation
  const totalCount = items.length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const scanningCount = items.filter((i) => i.status === 'scanning').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const isProcessing = scanningCount > 0 || pendingCount > 0;

  // Validation: items ready to save (must be included)
  const validItemsToSave = useMemo(() => {
    return items.filter(
      (item) =>
        item.isIncluded !== false &&
        item.status === 'done' &&
        item.amount > 0 &&
        item.description.trim().length > 0 &&
        item.accountId.trim().length > 0
    );
  }, [items]);

  const itemsMissingAttention = useMemo(() => {
    return items.filter(
      (item) =>
        item.isIncluded !== false &&
        item.status === 'done' &&
        (!item.accountId.trim() || !item.description.trim() || item.amount <= 0)
    );
  }, [items]);

  // Batch submit handler
  const handleBatchSubmit = async () => {
    if (validItemsToSave.length === 0) {
      toast.error(
        'No hay transacciones completas listas para guardar. Verifica monto, motivo y cuenta.'
      );
      return;
    }

    if (itemsMissingAttention.length > 0) {
      toast.warning(
        `Hay ${itemsMissingAttention.length} comprobante(s) con datos incompletos (cuenta o motivo). Solo se guardarán los ${validItemsToSave.length} completos.`
      );
    }

    setIsSubmitting(true);
    try {
      const transactionsToCreate: CreateTransactionDTO[] = validItemsToSave.map(
        (item) => {
          const selectedAccount = accounts.find((a) => a.id === item.accountId);
          const currencyCode =
            selectedAccount?.currencyCode || item.currency || 'USD';
          const isVesCurrency = currencyCode === 'VES';
          const exchangeRate = isVesCurrency ? activeUsdVes : undefined;

          return {
            type: item.type,
            accountId: item.accountId,
            categoryId: item.categoryId || undefined,
            currencyCode,
            amountMinor: toMinorUnits(item.amount, currencyCode),
            exchangeRate,
            date: item.date,
            description: item.description.trim(),
            note: item.referenceId
              ? `Comprobante Ref: ${item.referenceId}`
              : undefined,
            tags: ['comprobante-ia', 'batch'],
          };
        }
      );

      await runFinancialMutation({
        userId: user?.id,
        repository,
        domains: ['transactions', 'accounts', 'budgets'],
        mutation: async () => {
          const created = [];
          for (const tx of transactionsToCreate) {
            const res = await repository.transactions.create(tx);
            created.push(res);
          }
          return created;
        },
      });

      toast.success(
        `${transactionsToCreate.length} ${
          transactionsToCreate.length === 1
            ? 'transacción guardada'
            : 'transacciones guardadas'
        } exitosamente`
      );

      onSuccess?.();
      onClose();
      // Reset items
      setItems([]);
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar el lote de transacciones');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category & Account options for selects
  const categoryOptions = useMemo(() => {
    return [
      { value: '', label: 'Seleccionar categoría...' },
      ...categories.map((c) => ({
        value: c.id,
        label: `${c.icon || '🏷️'} ${c.name}`,
      })),
    ];
  }, [categories]);

  const accountOptions = useMemo(() => {
    return [
      { value: '', label: 'Seleccionar cuenta...' },
      ...accounts.map((a) => ({
        value: a.id,
        label: `${a.name} (${a.currencyCode})`,
      })),
    ];
  }, [accounts]);

  // Clean close
  const handleModalClose = () => {
    if (isProcessing) {
      if (
        !confirm(
          'Hay comprobantes analizándose. ¿Estás seguro de que deseas salir?'
        )
      ) {
        return;
      }
    }
    onClose();
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={handleModalClose}
        size="xl"
        title={
          <div className="flex flex-wrap items-center gap-2 pr-8 sm:pr-0">
            <div className="flex items-center gap-2">
              <Sparkles
                className="h-5 w-5 shrink-0 text-indigo-500"
                aria-hidden="true"
              />
              <span className="text-base font-semibold text-foreground sm:text-lg">
                Carga de Comprobantes en Lote
              </span>
            </div>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Hasta {MAX_BATCH_RECEIPTS} fotos
            </span>
          </div>
        }
        description="Sube hasta 20 capturas de pago o facturas. La IA extraerá monto, fecha, motivo y cuenta automáticamente."
      >
        <div className="flex max-h-[80vh] flex-col">
          {/* Scrollable Content Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {/* Hidden Accessible File Input */}
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/*"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) {
                  handleAddFiles(e.target.files);
                }
              }}
            />

            {/* Empty State Dropzone */}
            {items.length === 0 ? (
              <label
                htmlFor={fileInputId}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragOver
                    ? 'scale-[0.99] border-indigo-500 bg-indigo-500/10'
                    : 'border-border/60 bg-card/40 hover:border-indigo-400/60 hover:bg-card/60'
                }`}
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 shadow-inner">
                  <UploadCloud className="h-8 w-8" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  Arrastra hasta 20 comprobantes aquí
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Formatos soportados: PNG, JPG, WEBP. Analizaremos tus pagos
                  móviles, transferencias o recibos simultáneamente.
                </p>
                <div className="mt-5">
                  <span className="ios-button-primary inline-flex items-center gap-2 text-sm font-medium">
                    <FileImage className="h-4 w-4" />
                    Seleccionar imágenes
                  </span>
                </div>
              </label>
            ) : (
              <>
                {/* Progress & Stats Bar */}
                <div className="rounded-2xl border border-border/50 bg-card/80 p-4 shadow-sm backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                            <span className="text-sm font-medium text-foreground">
                              Analizando {doneCount + scanningCount} de{' '}
                              {totalCount}...
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-foreground">
                              Procesamiento finalizado ({doneCount}/{totalCount}{' '}
                              listos)
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {doneCount} listos
                        </span>
                        {isProcessing && (
                          <span>
                            • {pendingCount + scanningCount} en proceso
                          </span>
                        )}
                        {errorCount > 0 && (
                          <span className="font-medium text-destructive">
                            • {errorCount} con error
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add More Button if under cap */}
                    {items.length < MAX_BATCH_RECEIPTS && (
                      <label
                        htmlFor={fileInputId}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>
                          Agregar más ({MAX_BATCH_RECEIPTS - items.length}{' '}
                          restantes)
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Visual Progress Track */}
                  {totalCount > 0 && (
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                        style={{
                          width: `${Math.round(((doneCount + errorCount) / totalCount) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Duplicate Detection Alert Banner */}
                {duplicateItems.length > 0 && (
                  <div
                    data-testid="batch-duplicates-banner"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-800 dark:text-amber-200 sm:p-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
                      <div>
                        <p className="text-xs font-semibold sm:text-sm">
                          Se detectaron {duplicateItems.length} comprobante(s)
                          duplicado(s)
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
                          Han sido desmarcados automáticamente para evitar
                          cobros dobles. Puedes descartarlos todos con un clic o
                          marcar los que desees incluir.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDiscardAllDuplicates}
                      className="border-amber-500/50 text-xs font-medium text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Descartar {duplicateItems.length} duplicados
                    </Button>
                  </div>
                )}

                {/* Items Review List */}
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const isDone = item.status === 'done';
                    const isScanning = item.status === 'scanning';
                    const isPending = item.status === 'pending';
                    const isError = item.status === 'error';

                    return (
                      <div
                        key={item.id}
                        className={`group relative rounded-2xl border p-4 shadow-sm transition-all duration-200 ${
                          item.isDuplicate
                            ? 'border-amber-500/60 bg-amber-500/[0.04] dark:bg-amber-950/[0.15]'
                            : item.accountNeedsAttention && isDone
                              ? 'border-amber-500/50 bg-amber-500/[0.03] dark:bg-amber-950/[0.1]'
                              : isError
                                ? 'border-destructive/40 bg-destructive/[0.02]'
                                : 'border-border/50 bg-card/70 hover:border-border'
                        } ${item.isIncluded === false ? 'opacity-80' : ''}`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          {/* Thumbnail with Click-to-Preview */}
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="group/img relative block h-20 w-20 overflow-hidden rounded-xl border border-border/60 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:h-24 sm:w-24"
                              title="Haz clic para ver la imagen completa"
                              aria-label={`Ver comprobante ${index + 1}`}
                            >
                              <img
                                src={item.previewUrl}
                                alt={`Comprobante ${index + 1}`}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover/img:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/img:opacity-100">
                                <Eye className="h-5 w-5 text-white" />
                              </div>
                            </button>
                            <span className="shadow-xs absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                          </div>

                          {/* Content & Form Fields */}
                          <div className="min-w-0 flex-1 space-y-3">
                            {/* Top Status & Meta Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {isDone && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Listo
                                  </span>
                                )}
                                {isScanning && (
                                  <span className="inline-flex animate-pulse items-center gap-1 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Analizando...
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    En espera
                                  </span>
                                )}
                                {isError && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                    <AlertCircle className="h-3 w-3" />
                                    Error
                                  </span>
                                )}

                                {item.isDuplicate && (
                                  <span
                                    data-testid="duplicate-badge"
                                    className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {item.duplicateType === 'INTRA_BATCH'
                                      ? 'Duplicado en lote'
                                      : 'Duplicado en historial'}
                                  </span>
                                )}

                                {item.referenceId && (
                                  <span className="rounded-md bg-muted/60 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                    Ref: #{item.referenceId}
                                  </span>
                                )}

                                {item.result?.bankOrPlatform && (
                                  <span className="rounded-md bg-indigo-500/5 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                    {item.result.bankOrPlatform}
                                  </span>
                                )}

                                {item.result?.items &&
                                  item.result.items.length > 0 && (
                                    <span
                                      data-testid="batch-item-count-badge"
                                      className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                      title={item.result.items
                                        .map(
                                          (it) =>
                                            `${it.quantity ? it.quantity + 'x ' : ''}${it.description}`
                                        )
                                        .join(', ')}
                                    >
                                      🛒 {item.result.items.length}{' '}
                                      {item.result.items.length === 1
                                        ? 'artículo'
                                        : 'artículos'}
                                    </span>
                                  )}
                              </div>

                              {/* Item Action Buttons & Include Toggle */}
                              <div className="flex items-center gap-3">
                                <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                                  <input
                                    type="checkbox"
                                    checked={item.isIncluded !== false}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        item.id,
                                        'isIncluded',
                                        e.target.checked
                                      )
                                    }
                                    className="h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
                                    aria-label={`Incluir comprobante ${index + 1}`}
                                  />
                                  <span
                                    className={
                                      item.isIncluded === false
                                        ? 'text-muted-foreground line-through'
                                        : 'text-foreground'
                                    }
                                  >
                                    {item.isDuplicate
                                      ? 'Incluir de todos modos'
                                      : 'Incluir'}
                                  </span>
                                </label>

                                {isError && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRetryItem(item.id)}
                                    className="h-8 px-2 text-xs text-indigo-600 hover:text-indigo-700"
                                    title="Reintentar escaneo"
                                  >
                                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                    Reintentar
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="h-8 w-8 p-0 text-muted-foreground/70 transition-colors hover:text-destructive"
                                  title="Eliminar de la lista"
                                  aria-label={`Eliminar comprobante ${index + 1}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Duplicate Alert Details if detected */}
                            {item.isDuplicate && (
                              <div
                                data-testid="duplicate-card-alert"
                                className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200"
                              >
                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                                <div className="flex-1">
                                  <span className="font-semibold">
                                    {item.duplicateType === 'INTRA_BATCH'
                                      ? 'Comprobante duplicado en este lote: '
                                      : 'Comprobante ya registrado en historial: '}
                                  </span>
                                  <span>{item.duplicateReason}</span>
                                  {item.isIncluded === false && (
                                    <span className="mt-0.5 block text-[11px] italic text-amber-700/90 dark:text-amber-300/90">
                                      Desmarcado por defecto para proteger tu
                                      saldo. Marca &quot;Incluir de todos
                                      modos&quot; arriba si deseas guardarlo.
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Error Details if any */}
                            {isError && (
                              <p className="text-xs text-destructive">
                                {item.error || 'No se pudo leer la imagen.'}{' '}
                                Puedes completar los datos manualmente o
                                reintentar.
                              </p>
                            )}

                            {/* Fast-Fill Form Grid */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
                              {/* Motivo (Descripción) - Required */}
                              <div className="sm:col-span-2 lg:col-span-4">
                                <label className="mb-1 block text-xs font-medium text-foreground">
                                  Motivo (Descripción){' '}
                                  <span className="text-destructive">*</span>
                                </label>
                                <Input
                                  value={item.description}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      item.id,
                                      'description',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ej. Compra supermercado, Pago móvil..."
                                  disabled={isScanning}
                                  className={`text-sm ${
                                    isDone && !item.description.trim()
                                      ? 'border-amber-500/70 focus-visible:ring-amber-500'
                                      : ''
                                  }`}
                                />
                              </div>

                              {/* Categoría - Required */}
                              <div className="lg:col-span-3">
                                <label className="mb-1 block text-xs font-medium text-foreground">
                                  Categoría
                                </label>
                                <Select
                                  value={item.categoryId}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      item.id,
                                      'categoryId',
                                      e.target.value
                                    )
                                  }
                                  options={categoryOptions}
                                  disabled={isScanning}
                                  className="text-sm"
                                />
                              </div>

                              {/* Cuenta - Required (Highlighted if not detected) */}
                              <div className="lg:col-span-3">
                                <div className="mb-1 flex items-center justify-between">
                                  <label className="block text-xs font-medium text-foreground">
                                    Cuenta{' '}
                                    <span className="text-destructive">*</span>
                                  </label>
                                  {item.accountNeedsAttention && isDone && (
                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                      <AlertTriangle className="h-3 w-3" />
                                      Indicar
                                    </span>
                                  )}
                                </div>
                                <Select
                                  value={item.accountId}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      item.id,
                                      'accountId',
                                      e.target.value
                                    )
                                  }
                                  options={accountOptions}
                                  disabled={isScanning}
                                  className={`text-sm transition-colors ${
                                    item.accountNeedsAttention && isDone
                                      ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
                                      : ''
                                  }`}
                                />
                              </div>

                              {/* Monto y Moneda - Prefilled & Editable */}
                              <div className="lg:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-foreground">
                                  Monto ({item.currency || 'VES'})
                                </label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.amount || ''}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        item.id,
                                        'amount',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    disabled={isScanning}
                                    className="pr-12 text-sm font-medium"
                                  />
                                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                                    {item.currency}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sticky Modal Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-card/95 px-4 py-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleModalClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              {items.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('¿Vaciar todos los comprobantes?')) {
                      items.forEach((i) => revokePreviewUrl(i.previewUrl));
                      setItems([]);
                    }
                  }}
                  disabled={isSubmitting || isProcessing}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Vaciar lista
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {itemsMissingAttention.length > 0 && (
                <span className="hidden text-xs text-amber-600 dark:text-amber-400 sm:inline">
                  {itemsMissingAttention.length} comprobante(s) necesitan cuenta
                  o motivo
                </span>
              )}
              <Button
                type="button"
                onClick={handleBatchSubmit}
                disabled={
                  isSubmitting || isProcessing || validItemsToSave.length === 0
                }
                className="ios-button-primary min-w-[170px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Guardar {validItemsToSave.length}{' '}
                    {validItemsToSave.length === 1
                      ? 'Transacción'
                      : 'Transacciones'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Lightbox Preview Modal */}
      {previewItem && (
        <div
          className="animate-in fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200"
          onClick={() => setPreviewItem(null)}
          role="dialog"
          aria-label="Vista previa de comprobante"
        >
          <div
            className="relative flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-4 py-3">
              <div className="truncate text-sm font-medium text-foreground">
                {previewItem.file.name}
                {previewItem.referenceId && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    Ref: #{previewItem.referenceId}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewItem(null)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Cerrar vista previa"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center overflow-auto bg-black/20 p-2">
              <img
                src={previewItem.previewUrl}
                alt={previewItem.file.name}
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
