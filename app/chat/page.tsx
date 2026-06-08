import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
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
                <div className="black-theme-card border-b border-border/20 px-6 py-5">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                            <span className="text-2xl" aria-hidden="true">🤖</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Asistente Financiero IA
                            </h1>
                            <p className="text-sm text-muted-foreground">
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
