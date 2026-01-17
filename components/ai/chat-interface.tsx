'use client';

import { useChat } from '@ai-sdk/react';
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
        { emoji: '💰', label: '¿Cuál es mi saldo?', query: '¿Cuál es mi saldo?' },
        { emoji: '📊', label: 'Mis gastos recientes', query: 'Muéstrame mis transacciones recientes' },
        { emoji: '🎯', label: 'Crear meta', query: 'Crear una meta de ahorro' },
        { emoji: '💸', label: 'Registrar gasto', query: 'Gasté $50 en comida' },
    ];

    return (
        <div className="flex h-full flex-col bg-background">
            <ApprovalListener />
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-6">
                    {messages.length === 0 ? (
                        // Empty State - Welcome Screen
                        <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-center">
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-4xl">🤖</span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Asistente Financiero IA
                            </h2>
                            <p className="mt-3 max-w-md text-muted-foreground">
                                Pregúntame sobre tus finanzas, registra transacciones o consulta tu balance.
                            </p>

                            {/* Quick Actions Grid */}
                            <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3 sm:max-w-md">
                                {quickActions.map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setInput(action.query);
                                        }}
                                        className={cn(
                                            'group flex flex-col items-center rounded-xl border border-border bg-card p-4',
                                            'transition-ios hover:border-primary/50 hover:bg-primary/5',
                                            'hover-lift micro-bounce'
                                        )}
                                    >
                                        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                                            {action.emoji}
                                        </span>
                                        <span className="text-xs text-muted-foreground group-hover:text-foreground">
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
                                <div className="flex justify-start px-2 sm:px-0">
                                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-card border border-border px-4 py-3 shadow-sm">
                                        <div className="flex space-x-1">
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-xs text-muted-foreground">Pensando...</span>
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
                <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-3">
                    <p className="text-center text-sm text-destructive">
                        ⚠️ {error.message}
                    </p>
                </div>
            )}

            {/* Input Container - Sticky Bottom */}
            <div className="border-t border-border bg-background/80 backdrop-blur-xl px-4 py-4 safe-area-pb">
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
