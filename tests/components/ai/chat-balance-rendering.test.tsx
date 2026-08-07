import { fireEvent, render, screen } from '@testing-library/react';
import { ChatMessage } from '@/components/ai/chat-message';
import { ChatInterface } from '@/components/ai/chat-interface';
import type { UIMessage } from 'ai';

// Controllable useChat mock: messages are swapped between rerenders to simulate
// streaming chunks on the same message id.
jest.mock('@ai-sdk/react', () => {
  const state = { messages: [] as UIMessage[], status: 'ready' as const };
  return {
    useChat: () => ({
      messages: state.messages,
      sendMessage: jest.fn(),
      status: state.status,
      error: undefined,
    }),
    __setMockMessages: (messages: UIMessage[]) => {
      state.messages = messages;
    },
  };
});
const chatMock = jest.requireMock('@ai-sdk/react') as {
  __setMockMessages: (messages: UIMessage[]) => void;
};

// ApprovalListener subscribes to Supabase realtime; stub the client so the
// interface renders without network or open handles.
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: jest.fn() }),
      }),
    }),
    removeChannel: jest.fn(),
  }),
}));

/**
 * Makes the scroll owner report real geometry and browser-style clamping of
 * scrollTop to [0, scrollHeight - clientHeight] (jsdom does no layout).
 */
function stubScrollMetrics(
  el: HTMLElement,
  scrollHeight: number,
  clientHeight: number
): HTMLElement {
  let scrollTop = 0;
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = Math.max(0, Math.min(value, scrollHeight - clientHeight));
    },
  });
  return el;
}

function makeMessage(parts: unknown[], id = 'msg-1'): UIMessage {
  return { id, role: 'assistant', parts } as unknown as UIMessage;
}
function textPart(text: string): unknown {
  return { type: 'text', text };
}
function toolPart(output: unknown, type = 'tool-getAccountBalance'): unknown {
  return {
    type,
    toolCallId: 'call-1',
    state: 'output-available',
    input: {},
    output,
  };
}
const multiCurrencyOutput = {
  status: 'success',
  accounts: [
    { name: 'Checkings', balanceMinor: 1050, currencyCode: 'USD' },
    { name: 'Ahorro', balanceMinor: 250000, currencyCode: 'VES' },
    { name: 'Euro', balanceMinor: 1234, currencyCode: 'EUR' },
  ],
  usdSubtotalMinor: 1050,
};

describe('ChatMessage balance rendering', () => {
  it('renders a balance card with currency-aware rows and the USD subtotal for valid output', () => {
    render(
      <ChatMessage
        message={makeMessage([
          textPart('Here is your balance.'),
          toolPart(multiCurrencyOutput),
        ])}
      />
    );
    expect(screen.getByRole('heading', { name: 'Saldo' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Checkings')).toBeInTheDocument();
    expect(screen.getByText('Bs.2,500.00')).toBeInTheDocument();
    expect(screen.getByText('€12.34')).toBeInTheDocument();
    expect(screen.getAllByText('$10.50')).toHaveLength(2);
    expect(screen.getByText('Subtotal USD')).toBeInTheDocument();
  });

  it('omits the USD subtotal and never invents a zero when no USD account exists', () => {
    const noUsd = {
      status: 'success',
      accounts: [
        { name: 'Ahorro', balanceMinor: 250000, currencyCode: 'VES' },
        { name: 'Euro', balanceMinor: 1234, currencyCode: 'EUR' },
      ],
    };
    render(<ChatMessage message={makeMessage([toolPart(noUsd)])} />);
    expect(screen.getByText('Bs.2,500.00')).toBeInTheDocument();
    expect(screen.getByText('€12.34')).toBeInTheDocument();
    expect(screen.queryByText('Subtotal USD')).not.toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('shows the tool message for empty or failed states without fabricating a card', () => {
    render(
      <ChatMessage
        message={makeMessage([
          toolPart({
            status: 'empty',
            message: 'No accounts found for your user.',
          }),
        ])}
      />
    );
    expect(
      screen.getByText('No accounts found for your user.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Saldo' })
    ).not.toBeInTheDocument();
  });

  it('renders a safe generic fallback for malformed balance output instead of crashing', () => {
    render(<ChatMessage message={makeMessage([toolPart({ bogus: true })])} />);
    expect(screen.getByText('getAccountBalance')).toBeInTheDocument();
    expect(screen.getByText('{"bogus":true}')).toBeInTheDocument();
  });

  it('keeps the generic fallback for unknown tools', () => {
    render(
      <ChatMessage
        message={makeMessage([toolPart('Sunny 24°C', 'tool-weather')])}
      />
    );
    expect(screen.getByText('weather')).toBeInTheDocument();
    expect(screen.getByText('Sunny 24°C')).toBeInTheDocument();
  });

  it('updates the existing message node in place when the same message id streams new content', () => {
    const success = (balanceMinor: number) =>
      toolPart({
        status: 'success',
        accounts: [{ name: 'Checkings', balanceMinor, currencyCode: 'USD' }],
        usdSubtotalMinor: balanceMinor,
      });
    const { container, rerender } = render(
      <ChatMessage message={makeMessage([success(1050)])} />
    );
    const node = container.firstChild;
    expect(screen.getAllByText('$10.50')).toHaveLength(2);
    rerender(<ChatMessage message={makeMessage([success(2000)], 'msg-1')} />);
    expect(container.firstChild).toBe(node);
    expect(screen.getAllByText('$20.00')).toHaveLength(2);
    expect(screen.queryAllByText('$10.50')).toHaveLength(0);
  });

  it('renders the full card at a 320px viewport with no interactive controls', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    });
    const mobile = {
      status: 'success',
      accounts: [
        { name: 'Checkings', balanceMinor: 1050, currencyCode: 'USD' },
        {
          name: 'Cuenta de Ahorros para Vacaciones Larga',
          balanceMinor: 500,
          currencyCode: 'USD',
        },
      ],
      usdSubtotalMinor: 1550,
    };
    render(<ChatMessage message={makeMessage([toolPart(mobile)])} />);
    expect(screen.getByRole('heading', { name: 'Saldo' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(
      screen.getByText('Cuenta de Ahorros para Vacaciones Larga')
    ).toBeInTheDocument();
    expect(screen.getByText('$15.50')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalWidth,
    });
  });
});

describe('ChatInterface streaming and scroll', () => {
  beforeEach(() => {
    chatMock.__setMockMessages([]);
  });

  it('updates the streamed message in place without replacing the node or replaying the entrance animation', () => {
    chatMock.__setMockMessages([
      makeMessage([textPart('Aquí está tu saldo.')]),
    ]);
    const { rerender } = render(<ChatInterface />);
    const scrollContainer = screen.getByTestId('chat-scroll-container');
    const messageList = scrollContainer.firstElementChild!.firstElementChild!;
    const messageNode = messageList.firstElementChild!;

    // Retire the mount-time entrance animation, then stream more content.
    fireEvent.animationEnd(messageNode);
    chatMock.__setMockMessages([
      makeMessage([
        textPart('Aquí está tu saldo.'),
        textPart('$10.50 en USD.'),
      ]),
    ]);
    rerender(<ChatInterface />);

    expect(messageList.firstElementChild).toBe(messageNode);
    expect(screen.getByText('$10.50 en USD.')).toBeInTheDocument();
    expect(messageNode).not.toHaveClass('animate-fade-in-up');
  });

  it('follows streamed content only when the scroll owner is near the bottom and preserves position when scrolled away', () => {
    chatMock.__setMockMessages([makeMessage([textPart('Primer mensaje.')])]);
    const { rerender } = render(<ChatInterface />);
    const scrollContainer = stubScrollMetrics(
      screen.getByTestId('chat-scroll-container'),
      1000,
      400
    );

    // Near the bottom (10px above it) → the stream is followed to the newest
    // content (clamped to the real bottom, 600).
    scrollContainer.scrollTop = 590;
    fireEvent.scroll(scrollContainer);
    chatMock.__setMockMessages([
      makeMessage([textPart('Primer mensaje.'), textPart('Segundo chunk.')]),
    ]);
    rerender(<ChatInterface />);
    expect(scrollContainer.scrollTop).toBe(600);
    expect(screen.getByText('Segundo chunk.')).toBeInTheDocument();

    // Materially scrolled away → position is preserved while content updates.
    scrollContainer.scrollTop = 0;
    fireEvent.scroll(scrollContainer);
    chatMock.__setMockMessages([
      makeMessage([
        textPart('Primer mensaje.'),
        textPart('Segundo chunk.'),
        textPart('Tercer chunk.'),
      ]),
    ]);
    rerender(<ChatInterface />);
    expect(scrollContainer.scrollTop).toBe(0);
    expect(screen.getByText('Tercer chunk.')).toBeInTheDocument();

    // Back near the bottom → following resumes (590 → pinned to 600).
    scrollContainer.scrollTop = 590;
    fireEvent.scroll(scrollContainer);
    chatMock.__setMockMessages([
      makeMessage([
        textPart('Primer mensaje.'),
        textPart('Segundo chunk.'),
        textPart('Tercer chunk.'),
        textPart('Cuarto chunk.'),
      ]),
    ]);
    rerender(<ChatInterface />);
    expect(scrollContainer.scrollTop).toBe(600);
  });
});
