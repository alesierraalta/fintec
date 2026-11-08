'use client';

import type { UIMessage } from 'ai';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FormattedMarkdown } from './formatted-markdown';
import { ToolResult } from './tool-result';

interface ChatMessageProps {
  message: UIMessage;
}

const RETRIEVAL_TOOLS = ['tool-queryTransactions', 'tool-searchTransactions'];

type Part = { type?: string; text?: string; state?: string; output?: unknown };

/**
 * One chat turn (design 01, "Conversación con tarjetas"): the user's words
 * in a blue bubble, the assistant's text in a white bubble, and every
 * completed tool call as its own card below it.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const parts = (message.parts ?? []) as Part[];
  const textParts = parts.filter((p) => p.type === 'text' && p.text?.trim());
  const toolParts = parts.filter(
    (p) =>
      p.type?.startsWith('tool-') && p.state === 'output-available' && p.output
  );
  const retrievalOnly =
    !isUser &&
    textParts.length === 0 &&
    toolParts.length > 0 &&
    toolParts.every((p) => RETRIEVAL_TOOLS.includes(p.type!));
  const legacyContent =
    parts.length === 0 &&
    typeof (message as { content?: unknown }).content === 'string'
      ? ((message as { content?: string }).content as string)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        'flex w-full flex-col gap-2',
        isUser ? 'items-end' : 'items-start'
      )}
    >
      {(textParts.length > 0 || legacyContent) && (
        <div
          className={cn(
            'max-w-[82%] rounded-[18px] px-3.5 py-2.5 text-[15px] leading-relaxed sm:max-w-[70%]',
            isUser
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-card text-foreground shadow-soft'
          )}
        >
          {textParts.map((part, index) =>
            isUser ? (
              <span key={index} className="whitespace-pre-wrap">
                {part.text}
              </span>
            ) : (
              <FormattedMarkdown key={index} content={part.text!} />
            )
          )}
          {legacyContent &&
            (isUser ? (
              <span className="whitespace-pre-wrap">{legacyContent}</span>
            ) : (
              <FormattedMarkdown content={legacyContent} />
            ))}
        </div>
      )}

      {toolParts.map((part, index) => (
        <ToolResult
          key={`${part.type}-${index}`}
          type={part.type!}
          output={part.output}
        />
      ))}

      {retrievalOnly && (
        <p
          data-testid="chat-tool-only-notice"
          className="text-xs italic text-muted-foreground/80"
        >
          Consultas de datos completadas.
        </p>
      )}
    </motion.div>
  );
}
