import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChatInterface } from '@/components/ai/chat-interface';

/**
 * AI Chat Page
 * 
 * Protected route that requires authentication.
 * Renders the chat interface for authenticated users.
 */
export default async function ChatPage() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log('[Chat Page] User check:', {
        hasUser: !!user,
        userId: user?.id,
        error: error?.message
    });

    if (error || !user) {
        console.log('[Chat Page] Redirecting to login...');
        redirect('/auth/login');
    }

    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    💬 AI Assistant
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Ask me anything about your finances
                </p>
            </div>
            <div className="flex-1 overflow-hidden">
                <ChatInterface />
            </div>
        </div>
    );
}
