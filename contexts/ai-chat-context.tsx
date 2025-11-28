'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ChatMessage } from '@/lib/ai/chat-assistant';
import { ActionType } from '@/lib/ai/intention-detector';
import { ConversationSession } from '@/lib/ai/memory/episodic-memory';

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
  // Nuevos estados para múltiples chats
  sessions: ConversationSession[];
  activeSessionId: string | null;
  isLoadingSessions: boolean;
  // Estados para streaming
  streamingMessage: string;
  isStreaming: boolean;
  // Estado para herramientas
  toolsEnabled: boolean;
  setToolsEnabled: (enabled: boolean) => void;
  // Funciones existentes
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  confirmAction: () => Promise<void>;
  rejectAction: () => Promise<void>;
  clearChat: () => void;
  // Nuevas funciones para gestión de sesiones
  loadSessions: () => Promise<void>;
  createNewChat: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  loadSessionMessages: (sessionId: string) => Promise<void>;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  // Estados para múltiples chats
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  // Cache de mensajes por sesión
  const [messagesCache, setMessagesCache] = useState<Record<string, ChatMessage[]>>({});
  // Estados para streaming
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  // Estado para herramientas (habilitadas por defecto)
  const [toolsEnabled, setToolsEnabled] = useState<boolean>(true);

  /**
   * Carga las sesiones del usuario desde la API
   */
  const loadSessions = useCallback(async () => {
    if (!user?.id || isLoadingSessions) return;

    setIsLoadingSessions(true);
    try {
      const response = await fetch(`/api/ai/chat/sessions?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError('Error al cargar las conversaciones');
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user?.id]);

  /**
   * Crea una nueva sesión de chat
   */
  const createNewChat = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/ai/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      const newSession = data.session;

      // Agregar a la lista de sesiones
      setSessions(prev => [newSession, ...prev]);
      
      // Activar la nueva sesión
      setActiveSessionId(newSession.id);
      
      // Limpiar mensajes y mostrar mensaje de bienvenida
      setMessages([{
        role: 'assistant',
        content: '¡Hola! Soy tu asistente financiero. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre tus cuentas, transacciones, presupuestos o metas.',
      }]);
      setError(null);
      setPendingAction(null);
    } catch (err: any) {
      console.error('Error creating new chat:', err);
      setError('Error al crear nueva conversación');
    }
  }, [user?.id]);

  /**
   * Carga los mensajes de una sesión específica
   */
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!user?.id) return;

    // Verificar cache primero
    if (messagesCache[sessionId]) {
      setMessages(messagesCache[sessionId]);
      return;
    }

    try {
      const response = await fetch(
        `/api/ai/chat/messages?userId=${user.id}&sessionId=${sessionId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      const loadedMessages = data.messages || [];

      // Si no hay mensajes, mostrar mensaje de bienvenida
      if (loadedMessages.length === 0) {
        const welcomeMessage: ChatMessage = {
          role: 'assistant',
          content: '¡Hola! Soy tu asistente financiero. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre tus cuentas, transacciones, presupuestos o metas.',
        };
        setMessages([welcomeMessage]);
        setMessagesCache(prev => ({ ...prev, [sessionId]: [welcomeMessage] }));
      } else {
        setMessages(loadedMessages);
        setMessagesCache(prev => ({ ...prev, [sessionId]: loadedMessages }));
      }
    } catch (err: any) {
      console.error('Error loading session messages:', err);
      setError('Error al cargar los mensajes');
    }
  }, [user?.id, messagesCache]);

  /**
   * Selecciona una sesión y carga sus mensajes
   */
  const selectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    await loadSessionMessages(sessionId);
    setError(null);
    setPendingAction(null);
  }, [loadSessionMessages]);

  /**
   * Elimina una sesión
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `/api/ai/chat/sessions?userId=${user.id}&sessionId=${sessionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Remover de la lista
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // Limpiar cache
      setMessagesCache(prev => {
        const newCache = { ...prev };
        delete newCache[sessionId];
        return newCache;
      });

      // Si era la sesión activa, crear nueva o seleccionar otra
      if (activeSessionId === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          await selectSession(remainingSessions[0].id);
        } else {
          await createNewChat();
        }
      }
    } catch (err: any) {
      console.error('Error deleting session:', err);
      setError('Error al eliminar la conversación');
    }
  }, [user?.id, activeSessionId, sessions, selectSession, createNewChat]);

  /**
   * Renombra una sesión
   */
  const renameSession = useCallback(async (sessionId: string, title: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/ai/chat/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sessionId, title }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename session');
      }

      const data = await response.json();
      const updatedSession = data.session;

      // Actualizar en la lista
      setSessions(prev => 
        prev.map(s => s.id === sessionId ? updatedSession : s)
      );
    } catch (err: any) {
      console.error('Error renaming session:', err);
      setError('Error al renombrar la conversación');
    }
  }, [user?.id]);

  const openChat = useCallback(async () => {
    setIsOpen(true);
    
    // Cargar sesiones si no están cargadas
    if (sessions.length === 0 && !isLoadingSessions) {
      await loadSessions();
    }

    // Si hay sesiones pero no hay sesión activa, seleccionar la más reciente
    if (sessions.length > 0 && !activeSessionId) {
      await selectSession(sessions[0].id);
    }

    // Si no hay sesiones ni mensajes, crear nueva o mostrar bienvenida
    if (sessions.length === 0 && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: '¡Hola! Soy tu asistente financiero. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre tus cuentas, transacciones, presupuestos o metas.',
      }]);
    }
  }, [sessions, activeSessionId, messages.length, isLoadingSessions, loadSessions, selectSession]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Lee y parsea Server-Sent Events (SSE) desde un ReadableStream
   * Incluye buffering para agrupar chunks y reducir actualizaciones de UI
   */
  const readSSEStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (data: { type: string; text?: string }) => void,
    onDone: () => void,
    onError: (error: Error) => void
  ) => {
    const decoder = new TextDecoder();
    let buffer = '';
    let textBuffer = '';
    let lastUpdateTime = Date.now();
    const BUFFER_DELAY_MS = 50; // Agrupar chunks cada 50ms
    
    // Función para flush del buffer de texto
    const flushTextBuffer = () => {
      if (textBuffer) {
        onChunk({ type: 'content', text: textBuffer });
        textBuffer = '';
        lastUpdateTime = Date.now();
      }
    };
    
    // Usar requestAnimationFrame para actualizaciones suaves
    let rafId: number | null = null;
    const scheduleFlush = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          flushTextBuffer();
          rafId = null;
        });
      }
    };
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Flush cualquier texto pendiente antes de terminar
          flushTextBuffer();
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'done') {
                flushTextBuffer();
                onDone();
                return;
              }
              if (data.type === 'error') {
                flushTextBuffer();
                onError(new Error(data.message || 'Error en el stream'));
                return;
              }
              if (data.type === 'content' && data.text) {
                // Acumular texto en buffer
                textBuffer += data.text;
                
                // Flush si ha pasado suficiente tiempo o si el buffer es grande
                const timeSinceLastUpdate = Date.now() - lastUpdateTime;
                if (timeSinceLastUpdate >= BUFFER_DELAY_MS || textBuffer.length > 100) {
                  flushTextBuffer();
                } else {
                  scheduleFlush();
                }
              } else {
                // Otros tipos de datos se procesan inmediatamente
                onChunk(data);
              }
            } catch (e) {
              // Ignorar JSON inválido
            }
          }
        }
      }
    } catch (error: any) {
      flushTextBuffer();
      onError(error);
    } finally {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    }
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
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      // Determinar sessionId a usar
      let currentSessionId = activeSessionId;
      
      // Si no hay sesión activa, crear una nueva
      if (!currentSessionId) {
        try {
          const createResponse = await fetch('/api/ai/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
          if (createResponse.ok) {
            const createData = await createResponse.json();
            const newSession = createData.session;
            setSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
            currentSessionId = newSession.id;
          } else {
            // Fallback: generar sessionId temporal
            currentSessionId = `session-${user.id}-${Date.now()}`;
          }
        } catch (err) {
          console.error('Error creating session:', err);
          // Fallback: generar sessionId temporal
          currentSessionId = `session-${user.id}-${Date.now()}`;
        }
      }

      // Usar streaming por defecto
      const response = await fetch(`/api/ai/chat?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          userId: user.id,
          messages: newMessages,
          sessionId: currentSessionId,
          disableTools: !toolsEnabled,
        }),
      });

      // Verificar si la respuesta es un stream
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream') && response.body) {
        // Leer stream
        const reader = response.body.getReader();
        let accumulatedText = '';
        
        await readSSEStream(
          reader,
          (data) => {
            if (data.type === 'content' && data.text) {
              accumulatedText += data.text;
              setStreamingMessage(accumulatedText);
            }
          },
          () => {
            // Stream completado
            setIsStreaming(false);
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: accumulatedText || 'No recibí una respuesta válida.',
            };
            
            const updatedMessages = [...newMessages, assistantMessage];
            setMessages(updatedMessages);
            setStreamingMessage('');
            
            // Actualizar cache de mensajes
            if (currentSessionId) {
              setMessagesCache(prev => ({
                ...prev,
                [currentSessionId]: updatedMessages,
              }));
              
              // Actualizar lista de sesiones
              loadSessions().catch(err => console.error('Error loading sessions:', err));
            }
            
            setIsLoading(false);
          },
          (error) => {
            // Error en el stream, hacer fallback a modo normal
            console.error('Stream error, falling back to normal mode:', error);
            setIsStreaming(false);
            setStreamingMessage('');
            
            // Intentar modo normal como fallback
            fetch('/api/ai/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                messages: newMessages,
                sessionId: currentSessionId,
              }),
            })
              .then(res => res.json())
              .then(data => {
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: data.message || 'No recibí una respuesta válida.',
                };
                setMessages([...newMessages, assistantMessage]);
                setIsLoading(false);
              })
              .catch(err => {
                setError(err?.message || 'Error de conexión. Por favor intenta de nuevo.');
                // Usar newMessages en lugar de messages para preservar el mensaje del usuario
                setMessages(newMessages);
                setIsLoading(false);
              });
          }
        );
        return;
      }

      // Fallback a modo normal si no es stream
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
        // Usar newMessages en lugar de messages para preservar el mensaje del usuario
        setMessages(newMessages);
        return;
      }

      // Agregar respuesta del asistente
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || 'No recibí una respuesta válida.',
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      
      // Actualizar cache de mensajes
      if (currentSessionId) {
        setMessagesCache(prev => ({
          ...prev,
          [currentSessionId]: updatedMessages,
        }));

        // Actualizar lista de sesiones (refrescar para obtener última fecha)
        await loadSessions();
      }
      
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
  }, [user?.id, messages, activeSessionId, loadSessions]);

  const clearChat = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: 'Conversación reiniciada. ¿En qué puedo ayudarte?',
    }]);
    setError(null);
    setPendingAction(null);
    
    // Limpiar cache de la sesión actual
    if (activeSessionId) {
      setMessagesCache(prev => {
        const newCache = { ...prev };
        delete newCache[activeSessionId];
        return newCache;
      });
    }
  }, [activeSessionId]);

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
    sessions,
    activeSessionId,
    isLoadingSessions,
    streamingMessage,
    isStreaming,
    toolsEnabled,
    setToolsEnabled,
    openChat,
    closeChat,
    sendMessage,
    confirmAction,
    rejectAction,
    clearChat,
    loadSessions,
    createNewChat,
    selectSession,
    deleteSession,
    renameSession,
    loadSessionMessages,
  }), [
    messages,
    isLoading,
    error,
    isOpen,
    pendingAction,
    sessions,
    activeSessionId,
    isLoadingSessions,
    streamingMessage,
    isStreaming,
    toolsEnabled,
    setToolsEnabled,
    openChat,
    closeChat,
    sendMessage,
    confirmAction,
    rejectAction,
    clearChat,
    loadSessions,
    createNewChat,
    selectSession,
    deleteSession,
    renameSession,
    loadSessionMessages,
  ]);

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

