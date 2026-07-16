'use client';

import { useChat } from '@ai-sdk/react';
import {
  Sparkles,
  Wallet,
  BarChart3,
  Target,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { ApprovalListener } from './approval';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Main chat interface component with premium FinTec styling.
 * Responsive design for mobile and desktop.
 */
export function ChatInterface() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    api: '/api/chat',
  } as any);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({
      parts: [{ type: 'text', text: input }],
    });
    setInput('');
  };

  const quickActions = [
    {
      icon: Wallet,
      label: '¿Cuál es mi saldo?',
      query: '¿Cuál es mi saldo?',
    },
    {
      icon: BarChart3,
      label: 'Mis gastos recientes',
      query: 'Muéstrame mis transacciones recientes',
    },
    {
      icon: Target,
      label: 'Crear meta de ahorro',
      query: 'Crear una meta de ahorro',
    },
    {
      icon: Receipt,
      label: 'Registrar un gasto',
      query: 'Gasté $50 en comida',
    },
  ];

  return (
    <div className="flex h-full flex-col bg-background">
      <ApprovalListener />
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            // Empty State - Welcome Screen
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in-up">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-500 shadow-ios">
                  <Sparkles
                    className="h-8 w-8 text-white"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                ¿En qué te ayudo hoy?
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Consulta tu balance, registra gastos o crea metas de ahorro
                conversando.
              </p>

              {/* Quick Actions Grid */}
              <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3 sm:max-w-md">
                {quickActions.map((action) => (
                  <button
                    type="button"
                    key={action.label}
                    onClick={() => {
                      setInput(action.query);
                    }}
                    className={cn(
                      'group flex flex-col items-start gap-2.5 rounded-2xl border border-border/60 bg-card p-4 text-left',
                      'shadow-ios-sm transition-ios hover:border-primary/40 hover:bg-primary/5',
                      'focus-ring min-h-[44px]',
                      'hover-lift micro-bounce'
                    )}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition-ios group-hover:bg-primary/15">
                      <action.icon
                        className="h-[18px] w-[18px] text-primary"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-[13px] font-medium leading-snug text-foreground/80 group-hover:text-foreground">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message List
            <div className="space-y-4">
              {messages.map((message: any) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-end gap-2.5 animate-fade-in-up">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-500 shadow-ios-sm">
                    <Sparkles
                      className="h-4 w-4 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border/60 bg-card px-4 py-3.5 shadow-ios-sm">
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 pb-2">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5">
            <AlertTriangle
              className="h-4 w-4 flex-shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        </div>
      )}

      {/* Input Container - Sticky Bottom */}
      <div className="bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-4 pt-2 pb-safe-bottom">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
