'use client';

import { FormEvent } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

/**
 * Premium chat input component with FinTec styling.
 * Pill-shaped composer with an inset send button, enter-to-submit,
 * and loading states.
 */
export function ChatInput({
  input,
  setInput,
  handleSubmit,
  isLoading,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Pregunta sobre tus finanzas…"
        disabled={isLoading}
        rows={1}
        aria-label="Mensaje para el asistente"
        className={cn(
          'w-full resize-none rounded-3xl border border-border/60 bg-card py-3.5 pl-5 pr-14',
          'text-[16px] md:text-sm placeholder:text-muted-foreground',
          'shadow-ios-sm',
          'focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'transition-ios'
        )}
        style={{
          minHeight: '52px',
          maxHeight: '120px',
        }}
      />

      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        aria-label="Enviar mensaje"
        className={cn(
          'absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full',
          'bg-gradient-to-br from-primary to-blue-500 text-white shadow-ios-sm',
          'transition-ios hover:opacity-90 active:scale-95',
          'disabled:cursor-not-allowed disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none'
        )}
      >
        {isLoading ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
        )}
      </button>
    </form>
  );
}
