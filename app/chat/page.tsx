import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { ChatInterface } from '@/components/chat/chat-interface';

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
