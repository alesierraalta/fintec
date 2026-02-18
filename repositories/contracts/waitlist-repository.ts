export interface CreateWaitlistEntryInput {
  email: string;
  source: string;
  referrer?: string | null;
}

export interface WaitlistRepository {
  create(input: CreateWaitlistEntryInput): Promise<void>;
}
