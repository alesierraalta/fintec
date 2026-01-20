import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChatInterface } from '@/components/ai/chat-interface';
import { MainLayout } from '@/components/layout/main-layout';

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
            <div className="flex h-full flex-col -mx-4 sm:-mx-6 -my-6 sm:-my-8">
                {/* Premium Header */}
                <div className="black-theme-card border-b border-border/20 px-6 py-5">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                            <span className="text-2xl">🤖</span>
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
                    <ChatInterface />
                </div>
            </div>
        </MainLayout>
    );
}

