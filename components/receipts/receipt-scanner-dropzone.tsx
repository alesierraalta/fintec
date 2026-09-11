'use client';

import React, { useRef, useEffect, useState, useId } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Repeat,
  Loader2,
  FileImage,
} from 'lucide-react';
import { useReceiptScanner } from '@/hooks/use-receipt-scanner';
import type {
  AccountCandidate,
  ScannedReceiptResult,
  ScannedReceiptType,
} from '@/lib/ai/receipt-scanner/types';

export interface ReceiptScannerDropzoneProps {
  accounts?: AccountCandidate[];
  expectedType?: ScannedReceiptType;
  onScanSuccess: (result: ScannedReceiptResult) => void;
  onTransferRedirect?: (result: ScannedReceiptResult) => void;
  className?: string;
  compact?: boolean;
}

export function ReceiptScannerDropzone({
  accounts,
  expectedType,
  onScanSuccess,
  onTransferRedirect,
  className = '',
  compact = false,
}: ReceiptScannerDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropzoneRef = useRef<HTMLLabelElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const rawId = useId();
  const inputId = `receipt-scanner-${rawId.replace(/:/g, '')}`;

  const { isScanning, error, scannedResult, previewUrl, scanFile, reset } =
    useReceiptScanner({
      accounts,
      expectedType,
      onScanSuccess,
    });

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
  };

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

      {/* 1. Scanning State */}
      {isScanning && (
        <div
          role="status"
          aria-live="polite"
          className="relative animate-pulse overflow-hidden rounded-xl border border-primary/40 bg-primary/5 p-4 text-center transition-all"
        >
          <div className="flex flex-col items-center justify-center gap-2 py-3">
            <div className="relative">
              <Sparkles className="h-8 w-8 animate-spin text-primary" />
              <Loader2 className="absolute inset-0 h-8 w-8 animate-ping text-primary/30" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              Analizando captura con IA...
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
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Comprobante analizado"
                    className="h-full w-full object-cover"
                  />
                </div>
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
                reset();
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
        </div>
      )}

      {/* 3. Idle / Dropzone State */}
      {!isScanning && !scannedResult && (
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
    </div>
  );
}
