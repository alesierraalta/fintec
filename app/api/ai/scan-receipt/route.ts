import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { scanReceiptWithAI } from '@/lib/ai/receipt-scanner/scanner-service';
import type {
  AccountCandidate,
  ScannedReceiptType,
} from '@/lib/ai/receipt-scanner/types';
import { createServerAppRepository } from '@/repositories/factory';
import { logger } from '@/lib/utils/logger';

export const maxDuration = 45; // Allow ample time for multimodal AI processing

export async function POST(req: Request) {
  try {
    // 1. Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Rate Limiting
    const rateCheck = await checkRateLimit(user.id);
    if (!rateCheck.success) {
      return Response.json(
        {
          success: false,
          error:
            'Rate limit exceeded. Please wait a few moments before scanning another receipt.',
        },
        { status: 429 }
      );
    }

    // 3. Parse input (supports JSON or FormData)
    let image: string = '';
    let accounts: AccountCandidate[] = [];
    let expectedType: ScannedReceiptType | undefined;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const accountsJson = formData.get('accounts') as string | null;
      const expectedTypeRaw = formData.get('expectedType') as string | null;

      if (!file) {
        return Response.json(
          { success: false, error: 'No image file provided in form data' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type || !file.type.startsWith('image/')) {
        return Response.json(
          {
            success: false,
            error: 'El archivo debe ser una imagen válida (PNG, JPG, WEBP)',
          },
          { status: 400 }
        );
      }

      // Max size limit: 10MB
      const MAX_SIZE_BYTES = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE_BYTES) {
        return Response.json(
          {
            success: false,
            error: 'La imagen excede el límite máximo de 10MB',
          },
          { status: 400 }
        );
      }

      // Convert file to base64 data URL
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type || 'image/jpeg';
      image = `data:${mimeType};base64,${buffer.toString('base64')}`;

      if (accountsJson) {
        try {
          accounts = JSON.parse(accountsJson);
        } catch {
          // Ignore parse error and fall back to repository
        }
      }
      if (expectedTypeRaw) {
        expectedType = expectedTypeRaw as ScannedReceiptType;
      }
    } else {
      let json: any;
      try {
        json = await req.json();
      } catch {
        return Response.json(
          { success: false, error: 'Cuerpo de solicitud JSON inválido' },
          { status: 400 }
        );
      }

      image = json?.image;
      accounts = Array.isArray(json?.accounts) ? json.accounts : [];
      expectedType = json?.expectedType;
    }

    if (!image || typeof image !== 'string' || image.trim().length === 0) {
      return Response.json(
        { success: false, error: 'Missing or invalid image data in request' },
        { status: 400 }
      );
    }

    // Enforce 10MB size limit (base64 is ~1.37x binary, ~14MB max string length)
    const MAX_BASE64_LENGTH = 14 * 1024 * 1024;
    if (image.length > MAX_BASE64_LENGTH) {
      return Response.json(
        {
          success: false,
          error: 'La imagen excede el tamaño máximo permitido de 10MB',
        },
        { status: 413 }
      );
    }

    // Validate image format (data URL or http/https URL)
    if (
      !image.startsWith('data:image/') &&
      !image.startsWith('http://') &&
      !image.startsWith('https://')
    ) {
      return Response.json(
        {
          success: false,
          error:
            'El formato de imagen no es válido (debe ser data:image/* o URL)',
        },
        { status: 400 }
      );
    }

    // Validate expectedType if provided
    if (
      expectedType &&
      !['EXPENSE', 'INCOME', 'TRANSFER'].includes(expectedType)
    ) {
      expectedType = undefined;
    }

    // 4. If accounts not provided by client, load active accounts from repository
    if (!accounts || accounts.length === 0) {
      try {
        const repo = createServerAppRepository({ supabase });
        const userAccounts = await repo.accounts.findByUserId(user.id);
        accounts = userAccounts
          .filter((a) => a.active)
          .map((a) => ({
            id: a.id,
            name: a.name,
            currencyCode: a.currencyCode,
            type: a.type,
          }));
      } catch (err) {
        logger.warn(
          '[ReceiptScanner] Could not load accounts from server repo:',
          err
        );
      }
    }

    // 5. Run AI Vision Scanner
    const scannedData = await scanReceiptWithAI({
      image,
      accounts,
      expectedType,
    });

    return Response.json({
      success: true,
      data: scannedData,
    });
  } catch (error: any) {
    logger.error('[ReceiptScanner API Error]:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Error processing receipt image with AI',
      },
      { status: 500 }
    );
  }
}
