import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/components/ai/chat-input';

// Mock useSpeechRecognition
const mockStartListening = jest.fn();
const mockStopListening = jest.fn();
const mockResetTranscript = jest.fn();
let mockIsSupported = true;
let mockIsListening = false;
let mockError: string | null = null;
let mockTranscript = '';

jest.mock('@/hooks/use-speech-recognition', () => ({
  useSpeechRecognition: (options?: any) => {
    return {
      isSupported: mockIsSupported,
      isListening: mockIsListening,
      transcript: mockTranscript,
      error: mockError,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      resetTranscript: mockResetTranscript,
    };
  },
}));

describe('ChatInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupported = true;
    mockIsListening = false;
    mockError = null;
    mockTranscript = '';
  });

  it('renders input field and submit button', () => {
    const setInput = jest.fn();
    const handleSubmit = jest.fn();

    render(
      <ChatInput
        input="Hola"
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={false}
      />
    );

    const textarea = screen.getByLabelText('Mensaje para el asistente');
    expect(textarea).toHaveValue('Hola');
    expect(textarea).not.toHaveAttribute('placeholder');
    expect(textarea).toHaveClass('overflow-hidden');
    expect(screen.getByLabelText('Enviar mensaje')).toBeEnabled();
  });

  it('renders microphone button when speech recognition is supported', () => {
    render(
      <ChatInput
        input=""
        setInput={jest.fn()}
        handleSubmit={jest.fn()}
        isLoading={false}
      />
    );

    const micButton = screen.getByLabelText('Dictar mensaje por voz');
    expect(micButton).toBeInTheDocument();
  });

  it('calls startListening when clicking microphone button while idle', () => {
    render(
      <ChatInput
        input=""
        setInput={jest.fn()}
        handleSubmit={jest.fn()}
        isLoading={false}
      />
    );

    const micButton = screen.getByLabelText('Dictar mensaje por voz');
    fireEvent.click(micButton);

    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  it('shows active listening state and stops listening when clicked while listening', () => {
    mockIsListening = true;

    render(
      <ChatInput
        input=""
        setInput={jest.fn()}
        handleSubmit={jest.fn()}
        isLoading={false}
      />
    );

    const stopButton = screen.getByLabelText('Detener dictado por voz');
    expect(stopButton).toBeInTheDocument();
    expect(screen.getByText(/Escuchando/i)).toBeInTheDocument();

    fireEvent.click(stopButton);
    expect(mockStopListening).toHaveBeenCalledTimes(1);
  });
});
