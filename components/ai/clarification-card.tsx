'use client';

import { useState } from 'react';
import { useChatActions } from './chat-actions';
import { ChatCard } from './chat-card';

/**
 * The agent needs one choice before writing anything. Each option replies
 * on the user's behalf; the card locks after the first answer.
 */
export function ClarificationCard({
  message,
  options,
}: {
  message: string;
  options: string[];
}) {
  const actions = useChatActions();
  const [answered, setAnswered] = useState<string | null>(null);

  return (
    <ChatCard label="Necesito un dato" tone="warning">
      <p className="text-[15px] text-foreground">{message}</p>
      {actions && options.length > 0 && (
        <div
          className="mt-2.5 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Opciones"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={answered !== null}
              aria-pressed={answered === option}
              onClick={() => {
                setAnswered(option);
                actions.reply(option);
              }}
              className="focus-ring rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </ChatCard>
  );
}
