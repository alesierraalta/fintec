'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal, Button } from '@/components/ui';
import type { Transaction, CreateTransactionDTO } from '@/types/domain';
import type { CapturedTransaction } from '@/lib/ai/voice-capture/normalize';
import { toMinorUnits } from '@/lib/money';
import { detectHistoryDuplicate } from '@/lib/finance/duplicate-detector';
import { compressImage } from '@/hooks/use-receipt-scanner';
import {
  AccountSelect,
  CategorySelect,
  fieldClass,
  today,
  useCaptureSave,
  type CaptureProps,
} from './capture-controls';

type Row = CapturedTransaction & { selected?: boolean };

// Downscale screenshots before upload: serverless request bodies are small.
async function toUploadImage(file: File): Promise<File> {
  try {
    const dataUrl = await compressImage(file);
    const [header, base64] = dataUrl.split(',');
    const type = header.match(/^data:([^;]+)/)?.[1] ?? file.type;
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return new File([bytes], file.name, { type });
  } catch {
    return file;
  }
}
const micError =
  'No se pudo acceder al micrófono. Puedes subir un audio o escribir la explicación.';

export function VoiceCaptureModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  existingTransactions,
}: CaptureProps & { existingTransactions: Transaction[] }) {
  const [images, setImages] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const { saving, save } = useCaptureSave(onClose, onSuccess);
  const stop = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setRecording(false);
  };
  useEffect(() => {
    if (!isOpen) {
      generation.current++;
      stop();
    }
    return () => {
      generation.current++;
      stop();
    };
  }, [isOpen]);
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setImageUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);
  useEffect(() => {
    const url = audio ? URL.createObjectURL(audio) : '';
    setAudioUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [audio]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  const start = async () => {
    const current = generation.current;
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === 'undefined'
      )
        throw new Error();
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation.current !== current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const instance = new MediaRecorder(media);
      recorder.current = instance;
      const chunks: Blob[] = [];
      instance.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      instance.onstop = () => {
        if (generation.current === current)
          setAudio(
            new File(chunks, 'grabacion.webm', {
              type: instance.mimeType || 'audio/webm',
            })
          );
        media.getTracks().forEach((track) => track.stop());
      };
      instance.start();
      setSeconds(0);
      setRecording(true);
      setError('');
    } catch {
      stop();
      setError(micError);
    }
  };
  const duplicate = (row: Row) => {
    const account = accounts.find((item) => item.id === row.accountId);
    return detectHistoryDuplicate(
      {
        accountId: account?.id,
        date: row.date,
        amountMinor: account
          ? toMinorUnits(row.amount, account.currencyCode)
          : undefined,
        currencyCode: account?.currencyCode,
      },
      existingTransactions
    );
  };
  // Amounts below the account's precision (Binance "dust") round to zero and
  // would be rejected on save, aborting the rest of the batch.
  const minorAmount = (row: Row) => {
    const account = accounts.find((item) => item.id === row.accountId);
    return account && Number.isFinite(row.amount) && row.amount > 0
      ? toMinorUnits(row.amount, account.currencyCode)
      : 0;
  };
  // Each warning is independent: one must never hide another.
  const rowWarnings = (row: Row): string[] => {
    const account = accounts.find((item) => item.id === row.accountId);
    const warnings: string[] = [];
    if (row.date > today()) {
      warnings.push('Fecha futura: revisa el año antes de guardar.');
    }
    if (!account) return warnings;
    if (row.amount > 0 && minorAmount(row) === 0) {
      warnings.push(
        'Monto demasiado pequeño para esta cuenta: no se guardará.'
      );
    }
    if (!row.currency) {
      warnings.push(
        'No se pudo leer la moneda de la captura: revisa el monto antes de guardar.'
      );
    } else if (account.currencyCode !== row.currency) {
      warnings.push(
        `La captura está en ${row.currency} y la cuenta en ${account.currencyCode}: revisa el monto antes de guardar.`
      );
    }
    return warnings;
  };
  const selected = (rows || []).filter(
    (row) =>
      (row.selected ?? !duplicate(row).isDuplicate) &&
      minorAmount(row) > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(row.date)
  );
  const update = (index: number, patch: Partial<Row>) =>
    setRows((previous) =>
      previous!.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  const analyze = async () => {
    setLoading(true);
    setError('');
    const current = generation.current;
    try {
      const form = new FormData();
      const uploads = await Promise.all(images.map(toUploadImage));
      uploads.forEach((file) => form.append('images', file));
      if (audio) form.append('audio', audio);
      if (note) form.append('note', note);
      const response = await fetch('/api/ai/capture-batch', {
        method: 'POST',
        body: form,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success)
        throw new Error(result.error || 'No se pudo analizar la captura.');
      if (generation.current === current) setRows(result.data);
    } catch (cause) {
      if (generation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo analizar la captura.'
        );
    } finally {
      setLoading(false);
    }
  };
  const submit = () => {
    const transactions: CreateTransactionDTO[] = selected.map((row) => {
      const account = accounts.find((item) => item.id === row.accountId)!;
      return {
        date: row.date,
        description: row.description,
        type: row.type as CreateTransactionDTO['type'],
        amountMinor: toMinorUnits(row.amount, account.currencyCode),
        currencyCode: account.currencyCode,
        accountId: account.id,
        categoryId: row.categoryId || undefined,
        tags: ['captura-voz'],
      };
    });
    void save(transactions);
  };
  return (
    <Modal
      open={isOpen}
      onClose={() => {
        if (!saving) {
          generation.current++;
          stop();
          onClose();
        }
      }}
      title="Capturas + voz"
      size="xl"
      mobileFullScreen
      footer={
        rows ? (
          <Button disabled={saving || selected.length === 0} onClick={submit}>
            {saving ? 'Guardando…' : `Guardar ${selected.length} movimientos`}
          </Button>
        ) : (
          <Button
            disabled={!images.length || loading || recording}
            onClick={() => void analyze()}
          >
            {loading ? 'Analizando…' : 'Analizar'}
          </Button>
        )
      }
    >
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={loading || saving} className="space-y-4">
        {!rows ? (
          <>
            <label className="block">
              Capturas (máximo 10)
              <input
                className={fieldClass}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  setImages((previous) =>
                    [
                      ...previous,
                      ...Array.from(event.target.files || []).filter((file) =>
                        file.type.startsWith('image/')
                      ),
                    ].slice(0, 10)
                  );
                  event.target.value = '';
                }}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              {imageUrls.map((url, index) => (
                <div key={url}>
                  <img
                    src={url}
                    alt={`Captura ${index + 1}`}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImages((previous) =>
                        previous.filter((_, i) => i !== index)
                      )
                    }
                  >
                    Quitar captura {index + 1}
                  </button>
                </div>
              ))}
            </div>
            <Button onClick={() => (recording ? stop() : void start())}>
              {recording ? 'Detener' : 'Grabar'}
            </Button>
            {recording && <p role="status">Grabando: {seconds} s</p>}
            <label className="block">
              Subir audio
              <input
                type="file"
                accept="audio/*"
                disabled={recording}
                className={fieldClass}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file?.type.startsWith('audio/')) setAudio(file);
                  event.target.value = '';
                }}
              />
            </label>
            {audioUrl && (
              <div>
                <audio controls src={audioUrl} />
                <button type="button" onClick={() => setAudio(null)}>
                  Descartar audio
                </button>
              </div>
            )}
            <label className="block">
              Explicación escrita
              <textarea
                maxLength={4000}
                className={fieldClass}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </>
        ) : (
          rows.map((row, index) => (
            <section
              key={index}
              aria-label={`Movimiento ${index + 1}`}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <label>
                <input
                  type="checkbox"
                  checked={row.selected ?? !duplicate(row).isDuplicate}
                  onChange={(event) =>
                    update(index, { selected: event.target.checked })
                  }
                />
                Seleccionar movimiento {index + 1}
              </label>
              {duplicate(row).isDuplicate && <p>{duplicate(row).reason}</p>}
              {row.dateInferred && <p>fecha estimada</p>}
              <label className="block">
                Fecha
                <input
                  type="date"
                  className={fieldClass}
                  value={row.date || today()}
                  onChange={(event) =>
                    update(index, { date: event.target.value })
                  }
                />
              </label>
              <label className="block">
                Descripción
                <input
                  className={fieldClass}
                  value={row.description}
                  onChange={(event) =>
                    update(index, { description: event.target.value })
                  }
                />
              </label>
              <label className="block">
                Monto
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  className={fieldClass}
                  value={row.amount}
                  onChange={(event) =>
                    update(index, { amount: Number(event.target.value) })
                  }
                />
              </label>
              <label className="block">
                Tipo
                <select
                  className={fieldClass}
                  value={row.type}
                  onChange={(event) =>
                    update(index, {
                      type: event.target.value as Row['type'],
                      categoryId: null,
                    })
                  }
                >
                  <option value="EXPENSE">Gasto</option>
                  <option value="INCOME">Ingreso</option>
                </select>
              </label>
              <AccountSelect
                accounts={accounts}
                value={row.accountId || ''}
                onChange={(accountId) => update(index, { accountId })}
              />
              {!row.accountId && (
                <p>Selecciona una cuenta para guardar este movimiento.</p>
              )}
              {rowWarnings(row).map((warning) => (
                <p key={warning} role="alert">
                  {warning}
                </p>
              ))}
              <CategorySelect
                categories={categories}
                kind={row.type}
                value={row.categoryId || ''}
                onChange={(categoryId) => update(index, { categoryId })}
              />
            </section>
          ))
        )}
      </fieldset>
    </Modal>
  );
}
