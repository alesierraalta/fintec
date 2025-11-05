'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ChatMessage } from '@/lib/ai/chat-assistant';
import { ActionType } from '@/lib/ai/intention-detector';

/**
 * Interfaz para acción pendiente de confirmación
 */
export interface PendingAction {
  type: ActionType;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

interface AIChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  pendingAction: PendingAction | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  confirmAction: () => Promise<void>;
  rejectAction: () => Promise<void>;
  clearChat: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const openChat = useCallback(() => {
    setIsOpen(true);
    // Si no hay mensajes, agregar mensaje de bienvenida
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: '¡Hola! Soy tu asistente financiero. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre tus cuentas, transacciones, presupuestos o metas.',
      }]);
    }
  }, [messages.length]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!user?.id) {
      setError('Debes estar autenticado para usar el asistente');
      return;
    }

    if (!content.trim()) {
      return;
    }

    // Agregar mensaje del usuario al historial
    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          messages: newMessages,
        }),
      });

      const data = await response.json();

      // Mostrar logs de debug en la consola del navegador (solo en desarrollo)
      if (data.debugLogs && Array.isArray(data.debugLogs)) {
        console.group(`[AI Chat Debug] ${new Date().toLocaleTimeString()}`);
        data.debugLogs.forEach((log: { level: string; message: string; timestamp: number }) => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          switch (log.level) {
            case 'debug':
              console.debug(`[${time}] ${log.message}`);
              break;
            case 'info':
              console.info(`[${time}] ${log.message}`);
              break;
            case 'warn':
              console.warn(`[${time}] ${log.message}`);
              break;
            case 'error':
              console.error(`[${time}] ${log.message}`);
              break;
            default:
              console.log(`[${time}] ${log.message}`);
          }
        });
        console.groupEnd();
      }

      if (!response.ok) {
        // Manejar errores específicos
        if (response.status === 403) {
          setError(data.error || 'Esta función requiere suscripción Premium');
        } else {
          setError(data.error || 'Error al enviar mensaje');
        }
        // Remover el mensaje del usuario si falló
        setMessages(messages);
        return;
      }

      // Agregar respuesta del asistente
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || 'No recibí una respuesta válida.',
      };

      setMessages([...newMessages, assistantMessage]);
      
      // Si la respuesta incluye una acción pendiente de confirmación, guardarla
      if (data.action && data.action.requiresConfirmation) {
        setPendingAction({
          type: data.action.type,
          parameters: data.action.parameters,
          requiresConfirmation: true,
          confirmationMessage: data.action.confirmationMessage,
        });
      } else {
        // Si no hay acción pendiente, limpiar cualquier acción anterior
        setPendingAction(null);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err?.message || 'Error de conexión. Por favor intenta de nuevo.');
      // Remover el mensaje del usuario si falló
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, messages]);

  const clearChat = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: 'Conversación reiniciada. ¿En qué puedo ayudarte?',
    }]);
    setError(null);
    setPendingAction(null);
  }, []);

  /**
   * Confirma una acción pendiente
   */
  const confirmAction = useCallback(async () => {
    if (!pendingAction || !user?.id) {
      return;
    }

    // Enviar mensaje de confirmación al backend
    await sendMessage('sí');
    setPendingAction(null);
  }, [pendingAction, user?.id, sendMessage]);

  /**
   * Rechaza una acción pendiente
   */
  const rejectAction = useCallback(async () => {
    if (!pendingAction || !user?.id) {
      return;
    }

    // Enviar mensaje de rechazo al backend
    await sendMessage('no');
    setPendingAction(null);
  }, [pendingAction, user?.id, sendMessage]);

  const value = React.useMemo(() => ({
    messages,
    isLoading,
    error,
    isOpen,
    pendingAction,
    openChat,
    closeChat,
    sendMessage,
    confirmAction,
    rejectAction,
    clearChat,
  }), [messages, isLoading, error, isOpen, pendingAction, openChat, closeChat, sendMessage, confirmAction, rejectAction, clearChat]);

  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChat(): AIChatContextType {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
}

