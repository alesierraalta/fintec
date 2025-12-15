import { cn } from '@/lib/utils';
import { type UIMessage as Message } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';



interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message: msg }: MessageBubbleProps) {
  const message = msg as any;
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted/50 text-foreground rounded-bl-none border border-border/50'
        )}
      >
        {message.content && ( // Use message.content
          <div className="prose dark:prose-invert text-sm break-words">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.toolInvocations?.map((toolInvocation: any, index: number) => { // Use message.toolInvocations
          const { toolName, toolCallId, state } = toolInvocation;

          if (state === 'result') {
            const { result } = toolInvocation;
            return (
              <div key={index} className="mt-2 p-3 bg-background/50 rounded-lg text-xs border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Tool: {toolName}
                  </span>
                </div>
                <div className="text-foreground font-mono bg-background p-2 rounded border border-border/30 overflow-x-auto">
                  {typeof result === 'object' && (result as any).message ? (result as any).message : JSON.stringify(result, null, 2)}
                </div>
              </div>
            );
          } else {
            return (
              <div key={index} className="mt-2 p-2 bg-muted/30 rounded text-xs animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"></span>
                <span className="text-muted-foreground">Calling {toolName}...</span>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
