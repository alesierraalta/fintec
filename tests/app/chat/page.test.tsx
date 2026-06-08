import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock supabase server
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock main layout
jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock chat interface to avoid loading AI SDK
jest.mock('@/components/ai/chat-interface', () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat Interface</div>,
}));

describe('Chat Page - Dynamic Import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the chat page with header', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    });

    const { default: ChatPage } = await import('@/app/chat/page');
    render(await ChatPage());

    expect(screen.getByText('Asistente Financiero IA')).toBeInTheDocument();
    expect(screen.getByText('Pregúntame sobre tus finanzas')).toBeInTheDocument();
  });

  it('should render the chat interface component', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    });

    const { default: ChatPage } = await import('@/app/chat/page');
    render(await ChatPage());

    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
  });
});
