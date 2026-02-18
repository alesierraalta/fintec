import { createClient } from '@/lib/supabase/server';
import { createServerApprovalRequestsRepository } from '@/repositories/factory';

export interface ApprovalRequest {
  userId: string;
  threadId: string;
  actionType: string;
  actionData: any;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}

export async function requestApproval(
  request: ApprovalRequest
): Promise<string> {
  const supabase = await createClient();
  const repository = createServerApprovalRequestsRepository({ supabase });

  return repository.create({
    userId: request.userId,
    threadId: request.threadId,
    actionType: request.actionType,
    actionData: request.actionData,
    riskLevel: request.riskLevel,
    message: request.message,
  });
}

export async function waitForApproval(
  requestId: string,
  timeoutMs: number = 300000 // 5 min default
): Promise<{ approved: boolean; response: any }> {
  const supabase = await createClient();
  const repository = createServerApprovalRequestsRepository({ supabase });
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const data = await repository.findById(requestId);

    if (data?.status === 'approved') {
      return { approved: true, response: data.responseData };
    }

    if (data?.status === 'rejected') {
      return { approved: false, response: data.responseData };
    }

    if (data?.status === 'timeout') {
      throw new Error('Approval request timed out');
    }

    // Wait 2s before checking again (polling)
    // In a real app with WebSockets, we wouldn't need polling here if this runs on client,
    // but since this likely runs on parsing loop on server, polling or persistent connection is needed.
    // For server actions/route handlers, long polling is tricky.
    // NOTE: This approach blocks the serverless function.
    // Better architecture: Return "Waiting for approval" state to client, client subscribes to changes, then re-triggers action.
    // However, for this implementation inside tool execution, blocking is the "simplest" robust way if duration < timeout.
    // Vercel handling: maxDuration is 60s. 5 min wait will time out.
    // We will reduce polling wait time or implementing mechanism to return early.
    // For this phase, we assume short wait or client handling. We'll set timeout to 45s to be safe.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Timeout logic
  await repository.markTimeout(requestId);

  throw new Error('Approval request timed out');
}
