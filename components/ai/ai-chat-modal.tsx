'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { useAIChat } from '@/contexts/ai-chat-context';
import { ActionConfirmationButtons } from './action-confirmation-buttons';
import { ChatSidebar } from './chat-sidebar';
import { Send, X, RotateCcw, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal de chat con el asistente IA
 * Incluye sidebar para múltiples conversaciones
 */
export function AIChatModal() {
  const { isOpen, messages, isLoading, error, closeChat, sendMessage, clearChat, pendingAction, streamingMessage, isStreaming } = useAIChat();
  const [inputValue, setInputValue] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus en input cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      const message = inputValue.trim();
      setInputValue('');
      await sendMessage(message);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={closeChat}
      title={undefined} // Sin título, lo manejamos internamente
      size="xl"
      className="max-h-[90vh] max-w-[95vw] p-0"
    >
      <div className="flex h-full max-h-[90vh]">
        {/* Backdrop para mobile sidebar */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            'flex-shrink-0 border-r border-border transition-all duration-300',
            isMobile
              ? cn(
                  'fixed inset-y-0 left-0 z-50 bg-background',
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )
              : 'relative translate-x-0'
          )}
        >
          <ChatSidebar
            isMobile={isMobile}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Área principal de chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header con botón de menú en mobile */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
              <h2 className="text-lg font-semibold">Asistente Financiero</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeChat}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[300px]">
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
          </div>

          {/* Botones de confirmación (si hay acción pendiente) */}
          {pendingAction && <ActionConfirmationButtons />}

          {/* Área de input (ocultar si hay acción pendiente) */}
          {!pendingAction && (
            <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3">
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
    </Modal>
  );
}

