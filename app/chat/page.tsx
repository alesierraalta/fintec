'use client';

import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

// Lazy load ChatInterface since AI features are not needed for FCP
const ChatInterface = dynamic(
  () => import('@/components/chat/chat-interface').then(m => ({ default: m.ChatInterface })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Cargando chat...</div>
      </div>
    ),
    ssr: false
  }
);

export default function ChatPage() {
  return (
    <AuthGuard>
      <MainLayout>
        {/* We want the chat to fill the available space, overriding some layout defaults if needed */}
        <div className="h-[85vh] md:h-[calc(100vh-100px)] w-full overflow-hidden rounded-3xl border border-border/40 shadow-xl bg-background">
          <ChatInterface />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
