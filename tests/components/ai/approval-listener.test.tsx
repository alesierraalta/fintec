import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ApprovalListener } from '@/components/ai/approval/approval-listener';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

let mockSubscribeStatus = 'CHANNEL_ERROR';
const mockRemoveChannel = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({
        subscribe: (cb: (status: string) => void) => {
          cb(mockSubscribeStatus);
          return {};
        },
      }),
    }),
    removeChannel: mockRemoveChannel,
  }),
}));

describe('ApprovalListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeStatus = 'CHANNEL_ERROR';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);
  });

  it('does not display a blocking error toast when Realtime encounters CHANNEL_ERROR', async () => {
    render(<ApprovalListener />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/hitl/approvals', {
        method: 'GET',
        credentials: 'include',
      });
    });

    // Verify toast.error is NOT called on CHANNEL_ERROR
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining('Failed to connect to approval system')
    );
  });
});
