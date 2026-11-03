'use client';

import { UIMessage } from 'ai';
import { MessageSquare, Wrench, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BalanceCard } from './balance-card';
import { TransactionCard } from './transaction-card';
import { FormattedMarkdown } from './formatted-markdown';
import {
  accountBalanceResultSchema,
  createTransactionResultSchema,
} from '@/lib/ai/tools/schemas';

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
  const hasTextPart = message.parts?.some(
    (p: any) => p.type === 'text' && p.text?.trim()?.length > 0
  );
  const hasToolPart = message.parts?.some((p: any) =>
    p.type?.startsWith('tool-')
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex w-full items-end gap-2.5',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-ios-sm">
          <MessageSquare className="h-4 w-4 text-white" aria-hidden="true" />
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
        <div className="text-[15px] leading-relaxed">
          {message.parts ? (
            message.parts.map((part: any, index: number) => {
              // Render text parts with rich markdown formatting for assistant
              if (part.type === 'text') {
                return isUser ? (
                  <span key={index} className="whitespace-pre-wrap">
                    {part.text}
                  </span>
                ) : (
                  <FormattedMarkdown key={index} content={part.text} />
                );
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

                // Known transaction creation tool: dispatch validated structured output.
                if (part.type === 'tool-createTransaction') {
                  const parsed = createTransactionResultSchema.safeParse(
                    part.output
                  );
                  if (parsed.success) {
                    if (parsed.data.status === 'success') {
                      return (
                        <TransactionCard
                          key={index}
                          transaction={parsed.data.transaction}
                        />
                      );
                    }
                    return (
                      <div
                        key={index}
                        className="mt-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3"
                      >
                        <p className="text-sm text-destructive">
                          {parsed.data.message}
                        </p>
                      </div>
                    );
                  }
                }

                // Query and search tools: display clean status chips instead of raw debug dumps
                if (
                  part.type === 'tool-queryTransactions' ||
                  part.type === 'tool-searchTransactions'
                ) {
                  return (
                    <div
                      key={index}
                      className="my-1.5 inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                        <Check
                          className="h-2.5 w-2.5 text-primary"
                          aria-hidden="true"
                        />
                      </span>
                      <span>
                        {part.type === 'tool-queryTransactions'
                          ? 'Transacciones consultadas'
                          : 'Búsqueda de transacciones realizada'}
                      </span>
                    </div>
                  );
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
          ) : typeof (message as any).content === 'string' && !isUser ? (
            <FormattedMarkdown content={(message as any).content} />
          ) : (
            <span className="whitespace-pre-wrap">
              {(message as any).content}
            </span>
          )}

          {/* Notice when only retrieval tools ran without an assistant text body */}
          {!isUser && hasToolPart && !hasTextPart && (
            <div
              data-testid="chat-tool-only-notice"
              className="mt-1 text-xs italic text-muted-foreground/80"
            >
              Consultas de datos completadas.
            </div>
          )}
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
    </motion.div>
  );
}
