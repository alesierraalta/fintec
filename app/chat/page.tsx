import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { ChatPageClient } from './chat-page-client';

export const metadata: Metadata = {
  title: 'Asistente IA | FinTec',
  description: 'Consulta con nuestro asistente financiero inteligente.',
};

/**
 * AI Chat Page
 *
 * Protected route that requires authentication.
 * Renders the chat interface for authenticated users within MainLayout.
 */
export default async function ChatPage() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/auth/login');
    }

    return (
        <MainLayout>
            <div className="flex h-full flex-col">
                {/* Premium Header */}
                <div className="border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-xl sm:px-6">
                    <div className="mx-auto flex max-w-3xl items-center gap-3">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-500 shadow-ios-sm">
                            <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
                            <span
                                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success"
                                aria-hidden="true"
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-base font-semibold text-foreground">
                                Asistente Financiero IA
                            </h1>
                            <p className="truncate text-xs text-muted-foreground">
                                Pregúntame sobre tus finanzas
                            </p>
                        </div>
                    </div>
                </div>
                {/* Chat Interface - Full height */}
                <div className="flex-1 overflow-hidden min-h-0">
                    <ChatPageClient />
                </div>
            </div>
        </MainLayout>
    );
}
