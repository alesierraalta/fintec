import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

describe('useSpeechRecognition', () => {
  const originalSpeechRecognition = (global as any).SpeechRecognition;
  const originalWebkitSpeechRecognition = (global as any)
    .webkitSpeechRecognition;

  afterEach(() => {
    (global as any).SpeechRecognition = originalSpeechRecognition;
    (global as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    jest.clearAllMocks();
  });

  it('detects unsupported environment when SpeechRecognition APIs are missing', () => {
    delete (global as any).SpeechRecognition;
    delete (global as any).webkitSpeechRecognition;

    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBeNull();

    // Calling startListening does not crash
    act(() => {
      result.current.startListening();
    });
    expect(result.current.isListening).toBe(false);
  });

  it('initializes speech recognition and starts listening', () => {
    let mockInstance: any = null;

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onstart: (() => void) | null = null;
      onresult: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      onend: (() => void) | null = null;
      start = jest.fn(() => {
        if (this.onstart) this.onstart();
      });
      stop = jest.fn(() => {
        if (this.onend) this.onend();
      });
      abort = jest.fn(() => {
        if (this.onend) this.onend();
      });

      constructor() {
        mockInstance = this;
      }
    }

    (global as any).webkitSpeechRecognition = MockSpeechRecognition;

    const onTranscriptChange = jest.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ onTranscriptChange, lang: 'es-419' })
    );

    expect(result.current.isSupported).toBe(true);
    expect(result.current.isListening).toBe(false);

    act(() => {
      result.current.startListening();
    });

    expect(mockInstance.start).toHaveBeenCalled();
    expect(mockInstance.lang).toBe('es-419');
    expect(mockInstance.continuous).toBe(true);
    expect(mockInstance.interimResults).toBe(true);
    expect(result.current.isListening).toBe(true);

    // Simulate speech recognition result
    act(() => {
      mockInstance.onresult({
        resultIndex: 0,
        results: [
          Object.assign(
            [
              {
                transcript: 'Gasté 20 dólares en café',
                confidence: 0.95,
              },
            ],
            { isFinal: true }
          ),
        ],
      });
    });

    expect(result.current.transcript).toBe('Gasté 20 dólares en café');
    expect(onTranscriptChange).toHaveBeenCalledWith('Gasté 20 dólares en café');

    // Stop listening
    act(() => {
      result.current.stopListening();
    });

    expect(mockInstance.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('handles microphone permission denied error gracefully', () => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onstart: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      onend: (() => void) | null = null;
      start = jest.fn(() => {
        if (this.onerror) {
          this.onerror({ error: 'not-allowed' });
        }
      });
      stop = jest.fn();
      abort = jest.fn();
    }

    (global as any).SpeechRecognition = MockSpeechRecognition;

    const onError = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onError }));

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toContain('Permiso de micrófono denegado');
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Permiso de micrófono denegado')
    );
  });
});
