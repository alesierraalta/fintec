export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout';
export type ApprovalRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ApprovalRequestRow {
  id: string;
  userId: string;
  threadId: string;
  actionType: string;
  actionData: unknown;
  riskLevel: ApprovalRiskLevel;
  message: string;
  status: ApprovalStatus;
  responseData?: unknown;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalRequestInput {
  userId: string;
  threadId: string;
  actionType: string;
  actionData: unknown;
  riskLevel: ApprovalRiskLevel;
  message: string;
}

export interface ApprovalRequestsRepository {
  create(input: CreateApprovalRequestInput): Promise<string>;
  findById(id: string): Promise<ApprovalRequestRow | null>;
  findByIdForUser(
    id: string,
    userId: string
  ): Promise<ApprovalRequestRow | null>;
  listByUserId(userId: string): Promise<ApprovalRequestRow[]>;
  respond(
    id: string,
    userId: string,
    status: Extract<ApprovalStatus, 'approved' | 'rejected'>,
    responseData?: unknown
  ): Promise<void>;
  markTimeout(id: string): Promise<void>;
}
