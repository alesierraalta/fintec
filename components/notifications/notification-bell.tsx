'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { SupabaseNotificationsRepository } from '@/repositories/supabase/notifications-repository-impl';
import { useUnreadPolling } from '@/hooks/use-unread-polling';
import type { Notification } from '@/types/notifications';

export function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const repo = useMemo(
    () => new SupabaseNotificationsRepository(supabase as never),
    [supabase],
  );

  const { data: unreadCount = 0 } = useUnreadPolling<number>({
    queryKey: ['notifications', 'unread-count', userId] as const,
    queryFn: () => repo.countUnreadByUserId(userId!),
    intervalMs: 45_000,
    enabled: !!userId,
  });

  const handleNew = useCallback(() => {
    toast.info('Tienes nuevas notificaciones');
  }, []);

  const { data: unreadList = [], isLoading } = useUnreadPolling<Notification[]>({
    queryKey: ['notifications', 'unread', userId] as const,
    queryFn: () => repo.findUnreadByUserId(userId!),
    intervalMs: 45_000,
    enabled: !!userId,
    onNew: handleNew as never,
  });

  const markAsRead = useCallback(
    async (id: string) => {
      await repo.markAsRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    [repo, queryClient],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await repo.markAllAsRead(userId);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [repo, userId, queryClient]);

  if (!userId) return null;

  const count = typeof unreadCount === 'number' ? unreadCount : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end md:bottom-auto md:top-4">
      <button
        type="button"
        aria-label={count > 0 ? `Notificaciones, ${count} sin leer` : 'Notificaciones'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border/30 bg-card/80 shadow-ios-sm backdrop-blur-xl transition-ios hover:bg-card hover:shadow-ios-md focus-ring"
      >
        <Bell className="h-5 w-5 text-foreground" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-destructive-foreground shadow-sm"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notificaciones"
          className="mt-3 max-h-[70vh] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/40 bg-popover/95 shadow-ios-lg backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
            <h2 className="text-sm font-semibold text-popover-foreground">Notificaciones</h2>
            <div className="flex items-center gap-1">
              {unreadList.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-ring"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Marcar todo
                </button>
              )}
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : unreadList.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No tienes notificaciones nuevas
              </p>
            ) : (
              <ul className="divide-y divide-border/30">
                {unreadList.map((n) => (
                  <li key={n.id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                          {n.type}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      {n.action_url && (
                        <a
                          href={n.action_url}
                          className="mt-1 inline-block text-xs font-medium text-primary hover:underline focus-ring rounded"
                        >
                          Ver detalle
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Marcar "${n.title}" como leída`}
                      onClick={() => markAsRead(n.id)}
                      className="h-7 w-7 shrink-0 rounded-full border border-border/40 bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring flex items-center justify-center"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
