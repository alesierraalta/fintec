import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import {
  extractCapturedTransactions,
  isAudioCaptureAvailable,
  type CaptureMedia,
} from '@/lib/ai/voice-capture/capture-service';
import { buildHistoryHints } from '@/lib/ai/voice-capture/history-hints';
import { createServerAppRepository } from '@/repositories/factory';
import { logger } from '@/lib/utils/logger';

// Real runs took 15-58 s for one screenshot plus audio; the project runs on
// Vercel Hobby with Fluid compute, whose ceiling is 300 s.
export const maxDuration = 300;
// Stop the model ourselves before the platform kills the function, so the
// client gets a readable error instead of an opaque gateway timeout.
export const ANALYSIS_TIMEOUT_MS = 280_000;
// Recent transactions scanned for the user's own categorization convention.
// Evals: history in the prompt fixed 6/6 personal-convention cases vs 0/6.
export const HISTORY_LOOKBACK = 1000;

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_NOTE_LENGTH = 4000;

function fail(status: number, error: string) {
  return Response.json({ success: false, error }, { status });
}

async function toMedia(file: File): Promise<CaptureMedia> {
  return {
    data: new Uint8Array(await file.arrayBuffer()),
    // Drop codec parameters ("audio/webm;codecs=opus" -> "audio/webm").
    mediaType: file.type.split(';')[0].trim(),
  };
}

function todayInCaracas(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
  }).format(new Date());
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return fail(401, 'Unauthorized');

    const rateCheck = await checkRateLimit(user.id);
    if (!rateCheck.success) {
      return fail(429, 'Demasiadas solicitudes. Espera un momento.');
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail(400, 'Se esperaba un formulario con capturas.');
    }

    const images = form
      .getAll('images')
      .filter((value): value is File => value instanceof File);
    const audioEntry = form.get('audio');
    const audio = audioEntry instanceof File ? audioEntry : null;
    const noteEntry = form.get('note');
    const note =
      typeof noteEntry === 'string'
        ? noteEntry.slice(0, MAX_NOTE_LENGTH)
        : undefined;

    if (images.length === 0) {
      return fail(400, 'Sube al menos una captura.');
    }
    if (images.length > MAX_IMAGES) {
      return fail(400, `Máximo ${MAX_IMAGES} capturas por análisis.`);
    }
    if (images.some((image) => !image.type.startsWith('image/'))) {
      return fail(400, 'Las capturas deben ser imágenes (PNG, JPG, WEBP).');
    }
    if (images.some((image) => image.size > MAX_IMAGE_BYTES)) {
      return fail(413, 'Cada captura debe pesar menos de 10MB.');
    }
    if (audio && !audio.type.startsWith('audio/')) {
      return fail(400, 'La explicación debe ser un archivo de audio.');
    }
    if (audio && audio.size > MAX_AUDIO_BYTES) {
      return fail(413, 'El audio debe pesar menos de 15MB.');
    }
    if (audio && !isAudioCaptureAvailable()) {
      return fail(
        503,
        'El análisis de audio no está disponible. Escribe la explicación en texto.'
      );
    }

    // Accounts and categories always come from the server so the model can
    // never be steered toward ids the user does not own.
    const repo = createServerAppRepository({ supabase });
    const [userAccounts, userCategories, pastTransactions] = await Promise.all([
      repo.accounts.findByUserId(user.id),
      repo.categories.findActive(),
      // History only improves categories: a failure must not block analysis.
      repo.transactions.findAll(HISTORY_LOOKBACK).catch((error) => {
        logger.warn('[VoiceCapture] Could not load history hints', error);
        return [];
      }),
    ]);
    const categoryList = userCategories ?? [];

    const data = await extractCapturedTransactions({
      images: await Promise.all(images.map(toMedia)),
      audio: audio ? await toMedia(audio) : undefined,
      note,
      accounts: userAccounts
        .filter((a) => a.active)
        .map((a) => ({ id: a.id, name: a.name, currencyCode: a.currencyCode })),
      categories: categoryList.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind === 'INCOME' ? ('INCOME' as const) : ('EXPENSE' as const),
      })),
      today: todayInCaracas(),
      history: buildHistoryHints(pastTransactions, categoryList),
      abortSignal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    });

    return Response.json({ success: true, data });
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      logger.warn('[VoiceCapture] Analysis timed out');
      return fail(
        504,
        'El análisis tardó demasiado. Prueba con menos capturas o un audio más corto.'
      );
    }
    logger.error('[VoiceCapture API Error]:', error);
    return fail(500, 'No se pudieron analizar las capturas.');
  }
}
