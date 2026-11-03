'use client';

import { FormEvent, useRef, useState } from 'react';
import { ArrowUp, Loader2, Mic, MicOff, AlertCircle } from 'lucide-react';
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
 * inset send button, enter-to-submit, and loading states.
 */
export function ChatInput({
  input,
  setInput,
  handleSubmit,
  isLoading,
}: ChatInputProps) {
  const [speechError, setSpeechError] = useState<string | null>(null);
  const baseInputRef = useRef('');

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
      {/* Listening Status Indicator */}
      {isListening && (
        <div
          role="status"
          aria-live="polite"
          className="mb-2 flex animate-fade-in-up items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs text-primary shadow-ios-sm"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
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
        </div>
      )}

      {/* Voice Error Notification */}
      {speechError && (
        <div
          role="alert"
          className="mb-2 flex animate-fade-in-up items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-1.5 text-xs text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta o di: 'Gasté $20 en comida de Cartera'…"
          disabled={isLoading}
          rows={1}
          aria-label="Mensaje para el asistente"
          className={cn(
            'w-full resize-none rounded-3xl border border-border bg-secondary/60 py-3.5 pl-5',
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
          {/* Microphone Voice Dictation Button */}
          {isSupported && (
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
                'flex h-9 w-9 items-center justify-center rounded-full',
                'transition-ios active:scale-95',
                isListening
                  ? 'animate-pulse bg-destructive text-destructive-foreground shadow-md'
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
