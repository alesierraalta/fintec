import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApprovalRequestRow,
  ApprovalRequestsRepository,
  ApprovalStatus,
  CreateApprovalRequestInput,
} from '@/repositories/contracts';
import { supabase } from './client';

function mapApprovalRow(row: any): ApprovalRequestRow {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    actionType: row.action_type,
    actionData: row.action_data,
    riskLevel: row.risk_level,
    message: row.message,
    status: row.status,
    responseData: row.response_data,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseApprovalRequestsRepository
  implements ApprovalRequestsRepository
{
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async create(input: CreateApprovalRequestInput): Promise<string> {
    const { data, error } = await this.client
      .from('approval_requests')
      .insert({
        user_id: input.userId,
        thread_id: input.threadId,
        action_type: input.actionType,
        action_data: input.actionData,
        risk_level: input.riskLevel,
        message: input.message,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to create approval request: ${error?.message || 'unknown error'}`
      );
    }

    return data.id;
  }

  async findById(id: string): Promise<ApprovalRequestRow | null> {
    const { data, error } = await this.client
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get approval request: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapApprovalRow(data);
  }

  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<ApprovalRequestRow | null> {
    const { data, error } = await this.client
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get approval request: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapApprovalRow(data);
  }

  async listByUserId(userId: string): Promise<ApprovalRequestRow[]> {
    const { data, error } = await this.client
      .from('approval_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list approval requests: ${error.message}`);
    }

    return (data || []).map(mapApprovalRow);
  }

  async respond(
    id: string,
    userId: string,
    status: Extract<ApprovalStatus, 'approved' | 'rejected'>,
    responseData?: unknown
  ): Promise<void> {
    const { error } = await this.client
      .from('approval_requests')
      .update({
        status,
        response_data: responseData,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(
        `Failed to respond to approval request: ${error.message}`
      );
    }
  }

  async markTimeout(id: string): Promise<void> {
    const { error } = await this.client
      .from('approval_requests')
      .update({
        status: 'timeout',
        responded_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to mark approval timeout: ${error.message}`);
    }
  }
}
