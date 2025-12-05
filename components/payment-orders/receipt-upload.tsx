'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui';
import { Upload, X, Image as ImageIcon, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/repositories/supabase/client';

interface ReceiptUploadProps {
  orderId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ReceiptUpload({ orderId, onSuccess, onCancel }: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WebP) y PDF');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('El archivo excede el tamaño máximo de 10MB');
      return;
    }

    setError(null);
    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Get authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No autenticado');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload receipt
      const response = await fetch(`/api/payment-orders/${orderId}/receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al subir el comprobante');
      }

      setUploaded(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al subir el comprobante');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {!uploaded ? (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="relative rounded-xl border-2 border-dashed border-primary/30 bg-muted/20 p-8 transition-colors hover:border-primary/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  handleFileSelect(selectedFile);
                }
              }}
              className="hidden"
            />

            {!file ? (
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 font-medium">Arrastra el comprobante aquí</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  o haz clic para seleccionar un archivo
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Seleccionar Archivo
                </Button>
                <p className="mt-4 text-xs text-muted-foreground">
                  Formatos permitidos: JPG, PNG, WebP, PDF (máx. 10MB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {preview ? (
                  <div className="relative mx-auto max-w-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Preview"
                      className="rounded-lg border object-contain"
                    />
                    <button
                      onClick={handleRemove}
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-white hover:bg-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={handleRemove}
                      className="rounded p-1 hover:bg-muted"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              disabled={!file || loading}
              loading={loading}
              className="flex-1"
            >
              Subir Comprobante
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-green-500/30 bg-green-500/10 p-8 text-center">
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-600" />
          <h3 className="mb-2 text-lg font-semibold">Comprobante Subido</h3>
          <p className="text-sm text-muted-foreground">
            Tu orden está en revisión. Te notificaremos cuando sea aprobada.
          </p>
        </div>
      )}
    </div>
  );
}

