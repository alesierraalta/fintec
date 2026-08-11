'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Bot,
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
 * Follow streamed content only while the scroll owner is within this band
 * (in px) of the bottom; beyond it the user is reading history.
 */
const NEAR_BOTTOM_THRESHOLD = 120;

/**
 * Main chat interface component with premium FinTec styling.
 * Responsive design for mobile and desktop.
 */
export function ChatInterface() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Track proximity to the bottom of the scroll owner (the only scroll
  // listener; passive so it never blocks the scroll itself).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const near =
        el.scrollHeight - el.scrollTop - el.clientHeight <
        NEAR_BOTTOM_THRESHOLD;
      setIsNearBottom((prev) => (prev === near ? prev : near));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, []);

  // Follow the stream only while near the bottom; a scrolled-away user keeps
  // their reading position. Plain scrollTop assignment avoids smooth-scroll
  // work on every chunk and is naturally reduced-motion friendly.
  useEffect(() => {
    if (!isNearBottom) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isNearBottom]);

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
      iconClass: 'bg-primary/15 text-primary',
    },
    {
      icon: BarChart3,
      label: 'Mis gastos recientes',
      query: 'Muéstrame mis transacciones recientes',
      iconClass: 'bg-success-500/15 text-success-400',
    },
    {
      icon: Target,
      label: 'Crear meta de ahorro',
      query: 'Crear una meta de ahorro',
      iconClass: 'bg-warning-500/15 text-warning-400',
    },
    {
      icon: Receipt,
      label: 'Registrar un gasto',
      query: 'Gasté $50 en comida',
      iconClass: 'bg-error-500/15 text-error-400',
    },
  ];

  return (
    <div className="flex h-full flex-col bg-background">
      <ApprovalListener />
      {/* Messages Container */}
      <div
        ref={scrollRef}
        data-testid="chat-scroll-container"
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex h-full max-w-3xl flex-col px-4 py-6">
          {messages.length === 0 ? (
            // Empty State - Welcome Screen
            <div className="flex flex-1 animate-fade-in-up flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-ios">
                  <Bot className="h-8 w-8 text-white" aria-hidden="true" />
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
              <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
                {quickActions.map((action) => (
                  <button
                    type="button"
                    key={action.label}
                    onClick={() => {
                      setInput(action.query);
                    }}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-4 text-left',
                      'transition-ios hover:border-primary/50 hover:bg-secondary',
                      'focus-ring min-h-[44px]',
                      'hover-lift micro-bounce'
                    )}
                  >
                    <span
                      className={cn(
                        'transition-ios flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                        action.iconClass
                      )}
                    >
                      <action.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium leading-snug text-foreground/90 group-hover:text-foreground">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message List
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex animate-fade-in-up items-end gap-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-ios-sm">
                    <Bot className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-secondary/60 px-4 py-3.5 shadow-ios-sm">
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
      <div className="bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-4 pb-safe-bottom pt-2">
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
