'use client';

import dynamic from 'next/dynamic';

const ChatInterface = dynamic(
  () =>
    import('@/components/ai/chat-interface').then((mod) => ({
      default: mod.ChatInterface,
    })),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">
            Cargando asistente de IA…
          </p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export function ChatPageClient() {
  return <ChatInterface />;
}
