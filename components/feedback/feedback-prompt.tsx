'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type PromptState =
  | { status: 'prompt' }
  | { status: 'commenting'; sentiment: 'up' | 'down' }
  | { status: 'reacted'; sentiment: 'up' | 'down' };

interface FeedbackPromptProps {
  target_type: string;
  target_id: string;
  className?: string;
}

function storageKey(userId: string, targetType: string, targetId: string): string {
  return `fb:${userId}:${targetType}:${targetId}`;
}

export function FeedbackPrompt({ target_type, target_id, className }: FeedbackPromptProps) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<PromptState>({ status: 'prompt' });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      const id = user?.id ?? null;
      setUserId(id);
      if (id) {
        try {
          const stored = localStorage.getItem(storageKey(id, target_type, target_id));
          if (stored === 'up' || stored === 'down') {
            setState({ status: 'reacted', sentiment: stored });
          } else if (stored === '1') {
            setState({ status: 'reacted', sentiment: 'up' });
          }
        } catch {
          // ignore storage errors
        }
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      setUserId((prev) => (prev === id ? prev : id));
      if (id) {
        try {
          const stored = localStorage.getItem(storageKey(id, target_type, target_id));
          if (stored === 'up' || stored === 'down') {
            setState({ status: 'reacted', sentiment: stored });
          } else if (stored === '1') {
            setState({ status: 'reacted', sentiment: 'up' });
          } else {
            setState({ status: 'prompt' });
          }
        } catch {
          // ignore
        }
      } else {
        setState({ status: 'prompt' });
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, target_type, target_id]);

  useEffect(() => {
    if (!userId) return;
    try {
      const stored = localStorage.getItem(storageKey(userId, target_type, target_id));
      if (stored === 'up' || stored === 'down') {
        setState((prev) => (prev.status === 'reacted' && prev.sentiment === stored ? prev : { status: 'reacted', sentiment: stored }));
      } else if (stored === '1') {
        setState((prev) => (prev.status === 'reacted' && prev.sentiment === 'up' ? prev : { status: 'reacted', sentiment: 'up' }));
      } else if (state.status === 'reacted') {
        setState({ status: 'prompt' });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, target_type, target_id]);

  const handleThumb = useCallback((sentiment: 'up' | 'down') => {
    setState({ status: 'commenting', sentiment });
  }, []);

  const handleCancel = useCallback(() => {
    setState({ status: 'prompt' });
    setComment('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (state.status !== 'commenting') return;
    const sentiment = state.sentiment;
    let uid = userId;
    if (!uid) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      uid = user?.id ?? null;
      if (uid) setUserId(uid);
    }
    if (!uid) {
      toast.error('Debes iniciar sesión para enviar feedback');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type,
          target_id,
          sentiment,
          comment: comment.trim() ? comment.trim() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = (data?.error as string) || `Error ${res.status}`;
        throw new Error(msg);
      }
      try {
        localStorage.setItem(storageKey(uid, target_type, target_id), sentiment);
      } catch {
        // ignore storage write failure
      }
      setState({ status: 'reacted', sentiment });
      setComment('');
      toast.success('¡Gracias por tu feedback!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar tu feedback';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [state, comment, supabase, target_type, target_id, userId]);

  if (state.status === 'reacted') {
    return (
      <div className={cn('glass-card rounded-2xl border border-border/40 bg-card/60 p-4 shadow-ios-sm backdrop-blur-xl', className)}>
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {state.sentiment === 'up' ? '¡Gracias! Nos alegra que te haya servido.' : 'Gracias por tu feedback.'}
            </p>
            <p className="text-xs text-muted-foreground">Tu reacción ha sido registrada.</p>
          </div>
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full border', state.sentiment === 'up' ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border/40 bg-secondary text-muted-foreground')}>
            {state.sentiment === 'up' ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
          </span>
        </div>
      </div>
    );
  }

  if (state.status === 'commenting') {
    return (
      <div className={cn('glass-card rounded-2xl border border-border/40 bg-card/60 p-4 shadow-ios-sm backdrop-blur-xl', className)}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {state.sentiment === 'up' ? '¡Genial! ¿Quieres añadir un comentario?' : '¿Qué podemos mejorar?'}
          </p>
          <div className="flex items-center gap-2">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', state.sentiment === 'up' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>
              {state.sentiment === 'up' ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
            </span>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={handleCancel}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Cuéntanos más... opcional"
          maxLength={2000}
          rows={3}
          aria-label="Comentario opcional"
          className="min-h-[80px] w-full resize-none rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <div className="mt-1 text-right text-[11px] text-muted-foreground">{comment.length}/2000</div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="min-h-[44px] flex-1 rounded-xl border border-border/40 bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-secondary/80 active:scale-[0.98] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-ios-sm transition-smooth hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Enviar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-card rounded-2xl border border-border/40 bg-card/60 p-4 shadow-ios-sm backdrop-blur-xl', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">¿Esto te ha servido?</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Sí, me ha servido"
            onClick={() => handleThumb('up')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border/40 bg-card px-3 text-muted-foreground shadow-ios-sm transition-smooth hover:bg-primary/10 hover:text-primary hover:border-primary/20 active:scale-[0.98] focus-ring"
          >
            <ThumbsUp className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="No me ha servido"
            onClick={() => handleThumb('down')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border/40 bg-card px-3 text-muted-foreground shadow-ios-sm transition-smooth hover:bg-secondary hover:text-foreground active:scale-[0.98] focus-ring"
          >
            <ThumbsDown className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
