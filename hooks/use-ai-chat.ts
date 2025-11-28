/**
 * Hook para manejar conversaciones con el asistente IA
 * 
 * Gestiona estado del chat, envío de mensajes y manejo de errores.
 */

import { useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { ChatMessage } from '@/lib/ai/chat/chat-handler';

interface UseAIChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

/**
 * Hook para gestionar el chat con el asistente IA
 */
export function useAIChat(): UseAIChatReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
  }, []);

  return {
    messages,
    isLoading,
    error,
    isOpen,
    openChat,
    closeChat,
    sendMessage,
    clearChat,
  };
}

