'use client';

import { useState, useCallback } from 'react';
import type {
  AccountCandidate,
  ScannedReceiptResult,
  ScannedReceiptType,
  ScanReceiptResponse,
} from '@/lib/ai/receipt-scanner/types';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

export interface UseReceiptScannerOptions {
  accounts?: AccountCandidate[];
  expectedType?: ScannedReceiptType;
  onScanSuccess?: (result: ScannedReceiptResult) => void;
  onScanError?: (error: string) => void;
}

/**
 * Resizes and compresses an image in-memory using an HTML Canvas
 * to avoid uploading huge multi-megabyte raw photos.
 */
export async function compressImage(
  file: File,
  maxDimension = 1600
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawBase64 = e.target?.result as string;
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        resolve(rawBase64);
        return;
      }

      try {
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width || 100;
            let height = img.height || 100;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              // Fallback to raw base64 if canvas is unavailable
              resolve(rawBase64);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            // Convert to high-quality JPEG data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          } catch {
            // Fallback to raw base64 on canvas processing failure
            resolve(rawBase64);
          }
        };
        img.onerror = () => {
          // Fallback to raw base64 instead of failing
          resolve(rawBase64);
        };
        img.src = rawBase64;
      } catch {
        resolve(rawBase64);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function useReceiptScanner(options: UseReceiptScannerOptions = {}) {
  const { accounts, expectedType, onScanSuccess, onScanError } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] =
    useState<ScannedReceiptResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const scanFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        const errMsg = 'El archivo debe ser una imagen (JPG, PNG, WEBP, etc.)';
        setError(errMsg);
        toast.error(errMsg);
        return;
      }

      setIsScanning(true);
      setError(null);

      try {
        const compressedBase64 = await compressImage(file);
        setPreviewUrl(compressedBase64);

        const response = await fetch('/api/ai/scan-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: compressedBase64,
            accounts,
            expectedType,
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
        setScannedResult(result);
        onScanSuccess?.(result);

        toast.success(
          `Comprobante detectado: ${result.type === 'TRANSFER' ? 'Transferencia' : result.type === 'EXPENSE' ? 'Gasto' : 'Ingreso'} por ${result.amount} ${result.currency}`
        );
      } catch (err: any) {
        logger.error('[useReceiptScanner] Error scanning receipt:', err);
        const msg = err.message || 'Error al analizar el comprobante';
        setError(msg);
        onScanError?.(msg);
        toast.error(msg);
      } finally {
        setIsScanning(false);
      }
    },
    [accounts, expectedType, onScanSuccess, onScanError]
  );

  const reset = useCallback(() => {
    setIsScanning(false);
    setError(null);
    setScannedResult(null);
    setPreviewUrl(null);
  }, []);

  return {
    isScanning,
    error,
    scannedResult,
    previewUrl,
    scanFile,
    reset,
  };
}
