'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Mic, MicOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

/**
 * Premium chat input component with FinTec styling.
 * Pill-shaped composer with voice dictation (Web Speech API),
 * audio visualizer waveform, animated pulsing mic, enter-to-submit,
 * and loading states.
 */
export function ChatInput({
  input,
  setInput,
  handleSubmit,
  isLoading,
}: ChatInputProps) {
  const [speechError, setSpeechError] = useState<string | null>(null);
  const baseInputRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    if (scrollH > 120) {
      el.style.height = '120px';
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${Math.max(scrollH, 52)}px`;
      el.style.overflowY = 'hidden';
    }
  }, [input]);

  const { isSupported, isListening, startListening, stopListening } =
    useSpeechRecognition({
      lang: 'es-419',
      continuous: true,
      interimResults: true,
      onTranscriptChange: (transcript) => {
        const base = baseInputRef.current.trim();
        const updated = base ? `${base} ${transcript}` : transcript;
        setInput(updated);
      },
      onError: (err) => {
        setSpeechError(err);
        setTimeout(() => setSpeechError(null), 5000);
      },
    });

  const toggleVoiceRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      setSpeechError(null);
      baseInputRef.current = input;
      startListening();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        if (isListening) stopListening();
        handleSubmit(e as any);
      }
    }
  };

  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isListening) stopListening();
    handleSubmit(e);
  };

  return (
    <form onSubmit={onFormSubmit} className="relative">
      {/* Listening Status Indicator with Animated Audio Waveform */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className="mb-2 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs text-primary shadow-ios-sm"
          >
            <div className="flex items-center gap-2.5">
              {/* Dynamic Audio Waveform */}
              <div className="flex items-center gap-0.5" aria-hidden="true">
                {[0.4, 0.9, 0.6, 1, 0.5, 0.8, 0.3].map((scale, i) => (
                  <motion.span
                    key={i}
                    className="w-0.5 rounded-full bg-primary"
                    animate={{
                      height: ['6px', `${Math.round(scale * 16)}px`, '6px'],
                    }}
                    transition={{
                      duration: 0.6 + (i % 3) * 0.15,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.08,
                    }}
                    style={{ height: '6px' }}
                  />
                ))}
              </div>
              <span className="font-medium">
                Escuchando... Di tu gasto o pregunta
              </span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80"
            >
              Listo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Error Notification */}
      <AnimatePresence>
        {speechError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="alert"
            className="mb-2 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-1.5 text-xs text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{speechError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          aria-label="Mensaje para el asistente"
          className={cn(
            'w-full resize-none overflow-hidden rounded-3xl border border-border bg-secondary/60 py-3.5 pl-5',
            isSupported ? 'pr-24' : 'pr-14',
            'text-[16px] placeholder:text-muted-foreground md:text-sm',
            'shadow-ios-sm',
            'focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-60',
            isListening && 'border-primary/60 ring-2 ring-primary/20',
            'transition-ios'
          )}
          style={{
            minHeight: '52px',
            maxHeight: '120px',
          }}
        />

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
          {/* Microphone Voice Dictation Button with Ripple Ring */}
          {isSupported && (
            <div className="relative flex items-center justify-center">
              {isListening && (
                <>
                  <motion.span
                    className="absolute inset-0 rounded-full bg-destructive/40"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                  <motion.span
                    className="absolute inset-0 rounded-full bg-destructive/25"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: 'easeOut',
                      delay: 0.4,
                    }}
                  />
                </>
              )}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                disabled={isLoading}
                aria-label={
                  isListening
                    ? 'Detener dictado por voz'
                    : 'Dictar mensaje por voz'
                }
                title={
                  isListening
                    ? 'Detener grabación de voz'
                    : 'Hablar con el asistente'
                }
                className={cn(
                  'relative z-10 flex h-9 w-9 items-center justify-center rounded-full',
                  'transition-ios active:scale-95',
                  isListening
                    ? 'bg-destructive text-destructive-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary/80',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          {/* Submit Message Button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Enviar mensaje"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              'bg-gradient-to-br from-primary to-blue-500 text-white shadow-ios-sm',
              'transition-ios hover:opacity-90 active:scale-95',
              'disabled:cursor-not-allowed disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
