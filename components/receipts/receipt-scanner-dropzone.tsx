'use client';

import React, { useRef, useEffect, useState, useId, useMemo } from 'react';
import {
  Camera,
  Upload,
  Receipt,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Repeat,
  Loader2,
  FileImage,
  ShoppingCart,
  Clipboard,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useReceiptScanner } from '@/hooks/use-receipt-scanner';
import { detectHistoryDuplicate } from '@/lib/finance/duplicate-detector';
import { toMinorUnits } from '@/lib/money';
import type { Transaction } from '@/types/domain';
import type {
  AccountCandidate,
  CategoryCandidate,
  ScannedReceiptResult,
  ScannedReceiptType,
} from '@/lib/ai/receipt-scanner/types';

export interface ReceiptScannerDropzoneProps {
  accounts?: AccountCandidate[];
  categories?: CategoryCandidate[];
  expectedType?: ScannedReceiptType;
  existingTransactions?: Transaction[];
  onScanSuccess: (result: ScannedReceiptResult) => void;
  onTransferRedirect?: (result: ScannedReceiptResult) => void;
  onBatchUploadClick?: () => void;
  onReset?: () => void;
  className?: string;
  compact?: boolean;
}

export function ReceiptScannerDropzone({
  accounts,
  categories,
  expectedType,
  existingTransactions,
  onScanSuccess,
  onTransferRedirect,
  onBatchUploadClick,
  onReset,
  className = '',
  compact = false,
}: ReceiptScannerDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const dropzoneRef = useRef<HTMLLabelElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const rawId = useId();
  const inputId = `receipt-scanner-${rawId.replace(/:/g, '')}`;
  const cameraInputId = `receipt-scanner-camera-${rawId.replace(/:/g, '')}`;

  const { isScanning, error, scannedResult, previewUrl, scanFile, reset } =
    useReceiptScanner({
      accounts,
      categories,
      expectedType,
      onScanSuccess,
    });

  const duplicateMatch = useMemo(() => {
    if (
      !scannedResult ||
      !existingTransactions ||
      existingTransactions.length === 0
    ) {
      return null;
    }
    return detectHistoryDuplicate(
      {
        referenceId: scannedResult.referenceId,
        amountMinor: scannedResult.amount
          ? toMinorUnits(scannedResult.amount, scannedResult.currency || 'VES')
          : null,
        currencyCode: scannedResult.currency,
        date: scannedResult.date,
        accountId: scannedResult.suggestedAccountId,
      },
      existingTransactions
    );
  }, [scannedResult, existingTransactions]);

  // Global paste handler when dropzone is mounted
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            scanFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [scanFile]);

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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      scanFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      scanFile(files[0]);
    }
    // Reset input value so same file can be chosen again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator?.clipboard?.read) {
        toast.info(
          'Para pegar una captura, usa Ctrl+V directamente en la página.'
        );
        return;
      }
      const items = await navigator.clipboard.read();
      let imageBlob: Blob | null = null;
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          imageBlob = await item.getType(imageType);
          break;
        }
      }
      if (imageBlob) {
        const ext = imageBlob.type.split('/')[1] || 'png';
        const file = new File([imageBlob], `clipboard-${Date.now()}.${ext}`, {
          type: imageBlob.type,
        });
        scanFile(file);
      } else {
        toast.error('No se encontró ninguna imagen en el portapapeles');
      }
    } catch {
      toast.error(
        'No se pudo acceder al portapapeles. Usa Ctrl+V o autoriza el acceso.'
      );
    }
  };

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setZoomScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/*"
        onChange={handleFileChange}
        className="sr-only"
        id={inputId}
        tabIndex={-1}
        aria-label="Subir captura o comprobante"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="sr-only"
        id={cameraInputId}
        tabIndex={-1}
        aria-label="Tomar foto con la cámara"
        data-testid="camera-file-input"
      />

      {/* 1. Scanning State */}
      {isScanning && (
        <div
          role="status"
          aria-live="polite"
          className="relative animate-pulse overflow-hidden rounded-xl border border-primary/40 bg-primary/5 p-4 text-center transition-all"
        >
          <div className="flex flex-col items-center justify-center gap-2 py-3">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <Loader2 className="absolute inset-0 h-8 w-8 animate-ping text-primary/30" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              Analizando comprobante...
            </div>
            <p className="text-xs text-muted-foreground">
              Detectando montos, referencia, banco y cuentas sugeridas
            </p>
          </div>
        </div>
      )}

      {/* 2. Success Result State */}
      {!isScanning && scannedResult && (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setZoomScale(1);
                    setIsLightboxOpen(true);
                  }}
                  className="group relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-muted text-left transition-all hover:ring-2 hover:ring-primary/50"
                  title="Ver comprobante ampliado"
                  aria-label="Ver comprobante ampliado"
                  data-testid="receipt-thumbnail-preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Comprobante analizado"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <ZoomIn className="h-4 w-4 text-white" />
                  </div>
                </button>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileImage className="h-6 w-6" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                      scannedResult.type === 'TRANSFER'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : scannedResult.type === 'EXPENSE'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'bg-green-500/10 text-green-600 dark:text-green-400'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {scannedResult.type === 'TRANSFER'
                      ? 'Transferencia'
                      : scannedResult.type === 'EXPENSE'
                        ? 'Gasto'
                        : 'Ingreso'}
                  </span>

                  <span className="text-xs font-bold text-foreground">
                    {scannedResult.amount} {scannedResult.currency}
                  </span>

                  {scannedResult.targetAmount && (
                    <span className="text-xs text-muted-foreground">
                      → {scannedResult.targetAmount}{' '}
                      {scannedResult.targetCurrency}
                    </span>
                  )}

                  {scannedResult.fee !== undefined && scannedResult.fee > 0 && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      Fee: {scannedResult.fee}{' '}
                      {scannedResult.feeCurrency || scannedResult.currency}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  {scannedResult.bankOrPlatform && (
                    <span>{scannedResult.bankOrPlatform}</span>
                  )}
                  {scannedResult.paymentMethod && (
                    <span>• {scannedResult.paymentMethod}</span>
                  )}
                  {scannedResult.referenceId && (
                    <span>• Ref: {scannedResult.referenceId}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                if (cameraInputRef.current) {
                  cameraInputRef.current.value = '';
                }
                reset();
                onReset?.();
              }}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Quitar comprobante"
              aria-label="Quitar comprobante"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Account inference message */}
          {scannedResult.accountMatchReason && (
            <div
              className={`mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                scannedResult.accountMatchConfidence === 'AMBIGUOUS'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-muted/60 text-muted-foreground'
              }`}
            >
              {scannedResult.accountMatchConfidence === 'AMBIGUOUS' ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              <span className="truncate">
                {scannedResult.accountMatchReason}
              </span>
            </div>
          )}

          {/* Duplicate transaction warning */}
          {duplicateMatch?.isDuplicate && (
            <div
              role="alert"
              className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 space-y-0.5">
                <span className="font-semibold text-amber-800 dark:text-amber-200">
                  Posible comprobante duplicado:
                </span>{' '}
                <span>{duplicateMatch.reason}</span>
              </div>
            </div>
          )}

          {/* Transfer conversion offer (if scanned inside standard transaction form) */}
          {scannedResult.type === 'TRANSFER' && onTransferRedirect && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/5 p-2 text-xs">
              <span className="text-blue-600 dark:text-blue-400">
                Detectamos un cambio de divisas / transferencia.
              </span>
              <button
                type="button"
                onClick={() => onTransferRedirect(scannedResult)}
                className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Repeat className="h-3 w-3" />
                Ir a Transferencias
              </button>
            </div>
          )}
          {/* Line items preview if itemized receipt */}
          {scannedResult.items && scannedResult.items.length > 0 && (
            <div
              data-testid="detected-line-items"
              className="mt-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-foreground"
            >
              <div className="flex items-center gap-1.5 font-medium text-primary">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>
                  {scannedResult.items.length}{' '}
                  {scannedResult.items.length === 1
                    ? 'artículo detectado'
                    : 'artículos detectados'}
                </span>
              </div>
              <div className="mt-1.5 max-h-24 space-y-1 overflow-y-auto pr-1 text-[11px] text-muted-foreground">
                {scannedResult.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      {item.quantity ? `${item.quantity}x ` : ''}
                      {item.description}
                    </span>
                    {typeof item.totalPrice === 'number' && (
                      <span className="shrink-0 font-mono text-foreground">
                        {item.totalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category match badge */}
          {scannedResult.suggestedCategoryName && (
            <div
              data-testid="detected-category-badge"
              className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-400"
            >
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Categoría sugerida:{' '}
                <strong className="font-semibold">
                  {scannedResult.suggestedCategoryName}
                </strong>
                {scannedResult.categoryMatchReason
                  ? ` (${scannedResult.categoryMatchReason})`
                  : ''}
              </span>
            </div>
          )}

          {/* Fiscal invoice breakdown badge */}
          {(scannedResult.taxAmount !== undefined ||
            scannedResult.subtotal !== undefined ||
            scannedResult.invoiceNumber) && (
            <div
              data-testid="detected-fiscal-badge"
              className="mt-2 rounded-lg border border-border/70 bg-muted/40 p-2.5 text-xs text-muted-foreground"
            >
              <div className="flex items-center justify-between text-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  {scannedResult.invoiceNumber
                    ? `Factura Fiscal N° ${scannedResult.invoiceNumber}`
                    : 'Desglose Fiscal'}
                </span>
                {scannedResult.taxId && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    RIF: {scannedResult.taxId}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {scannedResult.subtotal !== undefined &&
                  scannedResult.subtotal !== null && (
                    <span>
                      Subtotal:{' '}
                      <strong className="font-mono text-foreground">
                        {scannedResult.subtotal.toFixed(2)}{' '}
                        {scannedResult.currency}
                      </strong>
                    </span>
                  )}
                {scannedResult.taxAmount !== undefined &&
                  scannedResult.taxAmount !== null && (
                    <span>
                      IVA
                      {scannedResult.taxRate
                        ? ` (${scannedResult.taxRate}%)`
                        : ''}
                      :{' '}
                      <strong className="font-mono text-foreground">
                        {scannedResult.taxAmount.toFixed(2)}{' '}
                        {scannedResult.currency}
                      </strong>
                    </span>
                  )}
                {scannedResult.igtfAmount !== undefined &&
                  scannedResult.igtfAmount !== null && (
                    <span>
                      IGTF:{' '}
                      <strong className="font-mono text-foreground">
                        {scannedResult.igtfAmount.toFixed(2)}{' '}
                        {scannedResult.currency}
                      </strong>
                    </span>
                  )}
                {scannedResult.discountAmount !== undefined &&
                  scannedResult.discountAmount !== null && (
                    <span>
                      Descuento:{' '}
                      <strong className="font-mono text-foreground">
                        -{scannedResult.discountAmount.toFixed(2)}{' '}
                        {scannedResult.currency}
                      </strong>
                    </span>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Idle / Dropzone State */}
      {!isScanning && !scannedResult && (
        <div className="space-y-2">
          <label
            htmlFor={inputId}
            ref={dropzoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`group relative flex cursor-pointer select-none items-center justify-center rounded-xl border border-dashed p-3 text-center transition-all ${
              isDragOver
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
            } ${compact ? 'py-2.5' : 'py-3.5'}`}
          >
            <div className="pointer-events-none flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <Camera className="h-4 w-4" />
              </div>

              <div className="text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <span>Subir captura de comprobante</span>
                  <span className="hidden items-center rounded border border-border bg-background px-1 text-[10px] font-normal text-muted-foreground sm:inline-flex">
                    Ctrl+V
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pago Móvil, Binance P2P, recibos o transferencias
                </p>
              </div>
            </div>
          </label>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="shadow-xs inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
              aria-label="Tomar foto con la cámara"
              data-testid="camera-button"
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span>Tomar foto</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePasteFromClipboard();
              }}
              className="shadow-xs inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
              aria-label="Pegar captura del portapapeles"
              data-testid="clipboard-button"
            >
              <Clipboard className="h-3.5 w-3.5 text-primary" />
              <span>Pegar captura</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="shadow-xs inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
              aria-label="Abrir galería o archivo"
              data-testid="gallery-button"
            >
              <FileImage className="h-3.5 w-3.5 text-primary" />
              <span>Galería / Archivo</span>
            </button>
          </div>
        </div>
      )}

      {/* Optional Batch Upload Action */}
      {!isScanning && !scannedResult && onBatchUploadClick && (
        <div className="mt-1.5 text-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBatchUploadClick();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:underline focus:outline-none"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>¿Tienes varios comprobantes? Cargar en lote (hasta 20)</span>
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && !isScanning && (
        <div
          role="alert"
          className="mt-2 flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {isLightboxOpen && previewUrl && (
        <div
          className="animate-in fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200"
          onClick={() => {
            setIsLightboxOpen(false);
            setZoomScale(1);
          }}
          role="dialog"
          aria-label="Vista previa ampliada de comprobante"
          data-testid="receipt-lightbox-modal"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                <span>Vista previa de comprobante</span>
                {scannedResult?.referenceId && (
                  <span className="font-mono text-xs text-muted-foreground">
                    Ref: #{scannedResult.referenceId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setZoomScale((z) =>
                      Math.min(Number((z + 0.25).toFixed(2)), 3)
                    )
                  }
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Acercar zoom"
                  aria-label="Acercar zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setZoomScale((z) =>
                      Math.max(Number((z - 0.25).toFixed(2)), 0.5)
                    )
                  }
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Alejar zoom"
                  aria-label="Alejar zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Restablecer zoom"
                  aria-label="Restablecer zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <div className="mx-1 h-4 w-px bg-border" />
                <button
                  type="button"
                  onClick={() => {
                    setIsLightboxOpen(false);
                    setZoomScale(1);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Cerrar vista previa"
                  aria-label="Cerrar vista previa"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex min-h-[300px] items-center justify-center overflow-auto bg-black/30 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Comprobante ampliado"
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[75vh] w-auto select-none rounded-lg object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
