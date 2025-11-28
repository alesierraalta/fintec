'use client';

import { useEffect, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { useAIChat } from '@/contexts/ai-chat-context';
import { ActionConfirmationButtons } from '@/components/ai/action-confirmation-buttons';
import { ChatSidebar } from '@/components/ai/chat-sidebar';
import { useSubscription } from '@/hooks/use-subscription';
import { useRouter } from 'next/navigation';
import { Send, RotateCcw, Menu, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

/**
 * Página dedicada para gestionar y usar los chats del asistente IA
 * Layout de dos columnas: lista de chats (izquierda) y área de chat (derecha)
 */
export default function ChatsPage() {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();

  // Redirigir si no es premium
  useEffect(() => {
    if (!subscriptionLoading && !isPremium) {
      router.push('/pricing');
    }
  }, [isPremium, subscriptionLoading, router]);

  if (subscriptionLoading) {
    return (
      <MainLayout>
        <AuthGuard>
          <div className="flex items-center justify-center h-full">
            <Loading size="lg" />
          </div>
        </AuthGuard>
      </MainLayout>
    );
  }

  if (!isPremium) {
    return null;
  }

  return (
    <MainLayout>
      <AuthGuard>
        <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] -mx-6 -my-8 md:-mx-6 md:-my-8">
          <ChatsPageContent />
        </div>
      </AuthGuard>
    </MainLayout>
  );
}

/**
 * Contenido principal de la página de chats
 */
function ChatsPageContent() {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    pendingAction,
    streamingMessage,
    isStreaming,
    toolsEnabled,
    setToolsEnabled,
    loadSessions,
  } = useAIChat();

  const [inputValue, setInputValue] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar sesiones al montar
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // En desktop, sidebar siempre visible
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll al final cuando hay nuevos mensajes o cuando se actualiza el streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Focus en input cuando se carga la página
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      const message = inputValue.trim();
      setInputValue('');
      await sendMessage(message);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Backdrop para mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Lista de chats */}
      <div
        className={cn(
          'flex-shrink-0 border-r border-border transition-all duration-300 bg-background',
          isMobile
            ? cn(
                'fixed inset-y-0 left-0 z-50',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              )
            : 'relative translate-x-0',
          isMobile ? 'w-full max-w-sm' : 'w-64'
        )}
      >
        <ChatSidebar
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Área principal de chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="p-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Asistente Financiero</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle de herramientas */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="tools-toggle"
                className="text-sm text-muted-foreground cursor-pointer"
                title="Activa/desactiva las herramientas avanzadas del asistente (function calling)"
              >
                Herramientas
              </label>
              <Switch
                id="tools-toggle"
                checked={toolsEnabled}
                onCheckedChange={setToolsEnabled}
                disabled={isLoading || isStreaming}
              />
            </div>
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[300px] bg-background">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">¡Hola! Soy tu asistente financiero</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Puedes preguntarme sobre tus cuentas, transacciones, presupuestos o metas.
                ¿En qué puedo ayudarte hoy?
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3',
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    )}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Mensaje en streaming */}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 max-w-[80%]">
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {streamingMessage}
                      <span className="inline-block w-2 h-4 ml-1 bg-gray-600 dark:bg-gray-400 animate-pulse">▋</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicador de carga (solo si no hay streaming) */}
              {isLoading && !isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                    <Loading size="sm" />
                  </div>
                </div>
              )}

              {/* Mensaje de error */}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg px-4 py-2 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Botones de confirmación (si hay acción pendiente) */}
        {pendingAction && <ActionConfirmationButtons />}

        {/* Área de input (ocultar si hay acción pendiente) */}
        {!pendingAction && (
          <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3 bg-background">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu pregunta..."
                disabled={isLoading}
                className="flex-1"
                onKeyDown={(e) => {
                  // Permitir Enter para enviar (Shift+Enter para nueva línea)
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading || isStreaming}
                className="px-4"
              >
                {isLoading ? (
                  <Loading size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={clearChat}
                disabled={isLoading}
                title="Limpiar conversación"
                className="px-3"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Presiona Enter para enviar, Shift+Enter para nueva línea
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

