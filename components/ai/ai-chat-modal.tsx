'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { useAIChat } from '@/contexts/ai-chat-context';
import { Send, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal de chat con el asistente IA
 */
export function AIChatModal() {
  const { isOpen, messages, isLoading, error, closeChat, sendMessage, clearChat } = useAIChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      title="Asistente Financiero"
      size="lg"
      className="max-h-[85vh] flex flex-col"
    >
      <div className="flex flex-col h-full max-h-[calc(85vh-140px)]">
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

          {/* Indicador de carga */}
          {isLoading && (
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

        {/* Área de input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
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
              disabled={!inputValue.trim() || isLoading}
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </p>
        </form>
      </div>
    </Modal>
  );
}

