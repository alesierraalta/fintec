'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscriptChange?: (transcript: string) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed':
    'Permiso de micrófono denegado. Habilítalo en tu navegador para dictar.',
  'service-not-allowed':
    'El servicio de reconocimiento de voz no está permitido en tu navegador.',
  'no-speech': 'No se detectó voz. Intenta hablar más cerca del micrófono.',
  'audio-capture': 'No se encontró ningún micrófono disponible.',
  network: 'Error de red al procesar el reconocimiento de voz.',
  aborted: 'Reconocimiento de voz cancelado.',
};

/**
 * Hook to manage SpeechRecognition (Web Speech API) with robust fallback
 * and clean lifecycle management.
 */
export function useSpeechRecognition({
  lang = 'es-419',
  continuous = true,
  interimResults = true,
  onTranscriptChange,
  onError,
  onEnd,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onErrorRef = useRef(onError);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
    onErrorRef.current = onError;
    onEndRef.current = onEnd;
  }, [onTranscriptChange, onError, onEnd]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition might already be stopped or inactive
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg =
        'El reconocimiento de voz no está soportado en este navegador.';
      setError(msg);
      onErrorRef.current?.(msg);
      return;
    }

    // Stop existing instance if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Safe ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            currentTranscript += result[0].transcript;
          }
        }

        if (currentTranscript.trim()) {
          setTranscript(currentTranscript);
          onTranscriptChangeRef.current?.(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        const errorCode = event.error || 'unknown';
        const friendlyMessage =
          ERROR_MESSAGES[errorCode] ||
          `Error en el reconocimiento de voz (${errorCode}).`;

        setError(friendlyMessage);
        setIsListening(false);
        onErrorRef.current?.(friendlyMessage);
      };

      recognition.onend = () => {
        setIsListening(false);
        onEndRef.current?.();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      const msg = err?.message || 'No se pudo iniciar el micrófono.';
      setError(msg);
      setIsListening(false);
      onErrorRef.current?.(msg);
    }
  }, [lang, continuous, interimResults]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Safe ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
