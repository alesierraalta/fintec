'use client';

import { UIMessage } from 'ai';
import { Sparkles, Wrench, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BalanceCard } from './balance-card';
import { accountBalanceResultSchema } from '@/lib/ai/tools/schemas';

interface ChatMessageProps {
  message: UIMessage;
}

/**
 * Individual chat message component with premium FinTec styling.
 * Assistant messages show a gradient avatar; user messages align right.
 * Supports text messages, tool outputs, and loading states.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  // Retire the entrance animation after the first play so streaming updates
  // never replay it on the same message node.
  const [entranceDone, setEntranceDone] = useState(false);

  return (
    <div
      onAnimationEnd={() => setEntranceDone(true)}
      className={cn(
        'flex w-full items-end gap-2.5',
        !entranceDone && 'animate-fade-in-up',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-500 shadow-ios-sm">
          <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
      )}

      <div
        className={cn(
          'transition-ios max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%]',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground shadow-ios-sm'
            : 'rounded-bl-md border border-border bg-secondary/60 text-foreground shadow-ios-sm'
        )}
      >
        {/* Message Content */}
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {message.parts
            ? message.parts.map((part: any, index: number) => {
                // Render text parts
                if (part.type === 'text') {
                  return <span key={index}>{part.text}</span>;
                }
                // Render tool output when available
                if (
                  part.type?.startsWith('tool-') &&
                  part.state === 'output-available' &&
                  part.output
                ) {
                  // Known balance tool: dispatch only validated structured output.
                  if (part.type === 'tool-getAccountBalance') {
                    const parsed = accountBalanceResultSchema.safeParse(
                      part.output
                    );
                    if (parsed.success) {
                      if (parsed.data.status === 'success') {
                        return (
                          <BalanceCard
                            key={index}
                            accounts={parsed.data.accounts}
                            usdSubtotalMinor={parsed.data.usdSubtotalMinor}
                          />
                        );
                      }
                      // Empty/error state: safe message text, no fabricated values.
                      return (
                        <div
                          key={index}
                          className="mt-2 rounded-xl border border-border/50 bg-muted/40 p-3"
                        >
                          <p className="text-sm text-muted-foreground">
                            {parsed.data.message}
                          </p>
                        </div>
                      );
                    }
                  }
                  // Unknown tool or malformed output: safe generic fallback.
                  return (
                    <div
                      key={index}
                      className="mt-2 rounded-xl border border-border/50 bg-muted/40 p-3"
                    >
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                          <Wrench
                            className="h-3 w-3 text-primary"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="font-medium">
                          {part.type.replace('tool-', '')}
                        </span>
                      </div>
                      <div className="text-sm">
                        {typeof part.output === 'string'
                          ? part.output
                          : JSON.stringify(part.output)}
                      </div>
                    </div>
                  );
                }
                // Ignore step-start and other non-visual types
                return null;
              })
            : (message as any).content}
        </div>

        {/* Legacy Tool Invocations Display */}
        {(message as any).toolInvocations &&
          (message as any).toolInvocations.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2">
              {(message as any).toolInvocations.map(
                (tool: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                      <Wrench
                        className="h-3 w-3 text-primary"
                        aria-hidden="true"
                      />
                    </span>
                    <span>{tool.toolName}</span>
                    {tool.state === 'result' && (
                      <Check
                        className="h-3.5 w-3.5 text-success"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </div>
  );
}
