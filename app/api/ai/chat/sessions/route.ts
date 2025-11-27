import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserSessions, 
  createOrUpdateSession, 
  updateSession, 
  deleteSession,
  ConversationSession 
} from '@/lib/ai/memory/episodic-memory';
import { canUseAI } from '@/lib/subscriptions/feature-gate';
import { logger } from '@/lib/utils/logger';
import { logSafeError } from '@/lib/ai/security';

/**
 * GET /api/ai/chat/sessions
 * 
 * Lista todas las sesiones de conversación del usuario
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener userId de query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    // Verificar suscripción premium
    const check = await canUseAI(userId);
    if (!check.allowed) {
      return NextResponse.json(
        { 
          error: check.reason,
          upgradeRequired: check.upgradeRequired 
        },
        { status: 403 }
      );
    }

    // Obtener límite opcional
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Obtener sesiones
    const sessions = await getUserSessions(userId, limit);

    return NextResponse.json({ sessions });
  } catch (error: any) {
    logSafeError('AI Chat Sessions GET: Error', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/chat/sessions
 * 
 * Crea una nueva sesión de conversación
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, metadata } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    // Verificar suscripción premium
    const check = await canUseAI(userId);
    if (!check.allowed) {
      return NextResponse.json(
        { 
          error: check.reason,
          upgradeRequired: check.upgradeRequired 
        },
        { status: 403 }
      );
    }

    // Generar nuevo sessionId
    const sessionId = `session-${userId}-${Date.now()}`;

    // Crear sesión
    const session = await createOrUpdateSession(
      sessionId,
      userId,
      title || undefined,
      undefined,
      metadata || {}
    );

    return NextResponse.json({ session });
  } catch (error: any) {
    logSafeError('AI Chat Sessions POST: Error', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/chat/sessions
 * 
 * Actualiza una sesión existente (principalmente para renombrar)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionId, title, summary, metadata } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid sessionId' },
        { status: 400 }
      );
    }

    // Verificar suscripción premium
    const check = await canUseAI(userId);
    if (!check.allowed) {
      return NextResponse.json(
        { 
          error: check.reason,
          upgradeRequired: check.upgradeRequired 
        },
        { status: 403 }
      );
    }

    // Preparar updates
    const updates: {
      title?: string;
      summary?: string;
      metadata?: Record<string, any>;
    } = {};

    if (title !== undefined) updates.title = title;
    if (summary !== undefined) updates.summary = summary;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Actualizar sesión
    const session = await updateSession(sessionId, userId, updates);

    return NextResponse.json({ session });
  } catch (error: any) {
    logSafeError('AI Chat Sessions PATCH: Error', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/chat/sessions
 * 
 * Elimina una sesión de conversación
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid sessionId' },
        { status: 400 }
      );
    }

    // Verificar suscripción premium
    const check = await canUseAI(userId);
    if (!check.allowed) {
      return NextResponse.json(
        { 
          error: check.reason,
          upgradeRequired: check.upgradeRequired 
        },
        { status: 403 }
      );
    }

    // Eliminar sesión
    await deleteSession(sessionId, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logSafeError('AI Chat Sessions DELETE: Error', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

