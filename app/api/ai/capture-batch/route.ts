import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import {
  extractCapturedTransactions,
  isAudioCaptureAvailable,
  type CaptureMedia,
} from '@/lib/ai/voice-capture/capture-service';
import { createServerAppRepository } from '@/repositories/factory';
import { logger } from '@/lib/utils/logger';

export const maxDuration = 60;

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
    const [userAccounts, userCategories] = await Promise.all([
      repo.accounts.findByUserId(user.id),
      repo.categories.findActive(),
    ]);

    const data = await extractCapturedTransactions({
      images: await Promise.all(images.map(toMedia)),
      audio: audio ? await toMedia(audio) : undefined,
      note,
      accounts: userAccounts
        .filter((a) => a.active)
        .map((a) => ({ id: a.id, name: a.name, currencyCode: a.currencyCode })),
      categories: (userCategories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind === 'INCOME' ? ('INCOME' as const) : ('EXPENSE' as const),
      })),
      today: todayInCaracas(),
    });

    return Response.json({ success: true, data });
  } catch (error) {
    logger.error('[VoiceCapture API Error]:', error);
    return fail(500, 'No se pudieron analizar las capturas.');
  }
}
