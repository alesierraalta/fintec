'use client';

import { FormEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
}

/**
 * Premium chat input component with FinTec styling.
 * Features auto-resize, enter-to-submit, and loading states.
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
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="relative flex-1">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe tu mensaje..."
                    disabled={isLoading}
                    rows={1}
                    className={cn(
                        'w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm',
                        'placeholder:text-muted-foreground',
                        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'transition-ios'
                    )}
                    style={{
                        minHeight: '48px',
                        maxHeight: '120px',
                    }}
                />
            </div>

            <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                    'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
                    'bg-primary text-primary-foreground',
                    'transition-ios hover:opacity-90 active:scale-95',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'micro-bounce'
                )}
            >
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Send className="h-5 w-5" />
                )}
            </button>
        </form>
    );
}
