'use client';

import { Sparkles } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

/**
 * FAB (Floating Action Button) para navegar a la página de chats del asistente IA
 * Solo visible para usuarios premium
 * Se oculta cuando ya estás en la página de chats
 */
export function AIChatFab() {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  // No mostrar si no es premium o está cargando
  if (subscriptionLoading || !isPremium) {
    return null;
  }

  // Ocultar si ya estás en la página de chats
  if (pathname === '/chats') {
    return null;
  }

  return (
    <div className="fixed bottom-48 right-6 z-40">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push('/chats');
        }}
        className={cn(
          'w-14 h-14 rounded-full shadow-ios-lg',
          'bg-gradient-to-br from-purple-500 to-purple-600',
          'hover:from-purple-600 hover:to-purple-700',
          'text-white hover:scale-110 active:scale-95',
          'transition-ios flex items-center justify-center',
          'backdrop-blur-sm cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
        )}
        title="Asistente Financiero IA"
        aria-label="Abrir asistente financiero"
        style={{ zIndex: 10000 }}
      >
        <Sparkles className="h-6 w-6" />
      </button>
    </div>
  );
}

