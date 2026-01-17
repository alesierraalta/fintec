'use client';

import { UIMessage } from 'ai';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
    message: UIMessage;
}

/**
 * Individual chat message component with premium FinTec styling.
 * Supports text messages, tool outputs, and loading states.
 */
export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div
            className={cn(
                'flex w-full px-2 sm:px-0',
                isUser ? 'justify-end' : 'justify-start'
            )}
        >
            <div
                className={cn(
                    'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 transition-ios',
                    isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border rounded-bl-md shadow-sm'
                )}
            >
                {/* Role Label - Subtle */}
                <div className={cn(
                    'mb-1.5 text-[10px] font-medium uppercase tracking-wide',
                    isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                    {isUser ? 'Tú' : '🤖 Asistente IA'}
                </div>

                {/* Message Content */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.parts ? (
                        message.parts.map((part: any, index: number) => {
                            // Render text parts
                            if (part.type === 'text') {
                                return <span key={index}>{part.text}</span>;
                            }
                            // Render tool output when available
                            if (part.type?.startsWith('tool-') && part.state === 'output-available' && part.output) {
                                return (
                                    <div key={index} className="mt-2 rounded-lg bg-muted/50 p-3">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">🔧</span>
                                            <span className="font-medium">{part.type.replace('tool-', '')}</span>
                                        </div>
                                        <div className="text-sm">{part.output}</div>
                                    </div>
                                );
                            }
                            // Ignore step-start and other non-visual types
                            return null;
                        })
                    ) : (
                        (message as any).content
                    )}
                </div>

                {/* Legacy Tool Invocations Display */}
                {(message as any).toolInvocations && (message as any).toolInvocations.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2">
                        {(message as any).toolInvocations.map((tool: any, index: number) => (
                            <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">🔧</span>
                                <span>{tool.toolName}</span>
                                {tool.state === 'result' && <span className="text-emerald-500">✓</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
