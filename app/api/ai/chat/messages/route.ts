import { NextRequest, NextResponse } from 'next/server';
import { searchConversations } from '@/lib/ai/memory/episodic-memory';
import { canUseAI } from '@/lib/subscriptions/feature-gate';
import { logger } from '@/lib/utils/logger';
import { logSafeError } from '@/lib/ai/security';
import { ChatMessage } from '@/lib/ai/chat-assistant';

/**
 * GET /api/ai/chat/messages
 * 
 * Obtiene los mensajes de una sesión específica
 */
export async function GET(request: NextRequest) {
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

    // Obtener límite opcional
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Buscar mensajes de la sesión
    const conversationMessages = await searchConversations(userId, {
      sessionId,
      limit,
    });

    // Convertir ConversationMessage[] a ChatMessage[]
    const messages: ChatMessage[] = conversationMessages
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) // Ordenar cronológicamente
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    return NextResponse.json({ messages });
  } catch (error: any) {
    logSafeError('AI Chat Messages GET: Error', error);
    return NextResponse.json(
      { error: 'Failed to retrieve messages' },
      { status: 500 }
    );
  }
}

