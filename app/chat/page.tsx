import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import { MainLayout } from '@/components/layout/main-layout';
import { MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';
import { ChatPageClient } from './chat-page-client';

export const metadata: Metadata = {
  title: 'Asistente Financiero | FinTec',
  description: 'Consulta con nuestro asistente financiero inteligente.',
};

/**
 * AI Chat Page
 *
 * Protected route that requires authentication.
 * Renders the chat interface for authenticated users within MainLayout.
 */
export default async function ChatPage() {
  await requireAuthenticatedUser();

  return (
    <MainLayout>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Adaptive Header */}
        <div className="border-b border-border/60 bg-card/80 px-3 py-2 sm:px-6 sm:py-3">
          <div className="mx-auto flex max-w-3xl items-center gap-2.5 sm:gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-ios-sm sm:h-10 sm:w-10">
              <MessageSquare
                className="h-4 w-4 text-white sm:h-5 sm:w-5"
                aria-hidden="true"
              />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success sm:h-3 sm:w-3"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                Asistente Financiero
              </h1>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                Registra gastos, ingresos y transferencias hablando
              </p>
            </div>
          </div>
        </div>
        {/* Chat Interface - Full height */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <ChatPageClient />
        </div>
      </div>
    </MainLayout>
  );
}
