import type {
  PendingItem,
  PendingItemKind,
  CreatePendingItemDTO,
  UpdatePendingItemDTO,
} from '@/types/pending-item';

export interface PendingItemsRepository {
  /** All pending items for the user, ordered by creation date. */
  findByUser(userId: string): Promise<PendingItem[]>;
  create(userId: string, data: CreatePendingItemDTO): Promise<PendingItem>;
  update(id: string, data: UpdatePendingItemDTO): Promise<PendingItem>;
  delete(id: string): Promise<void>;
  /**
   * Removes every completed item for the user. When `kind` is given,
   * only completed items of that kind are removed ("limpiar completados").
   */
  deleteCompleted(userId: string, kind?: PendingItemKind): Promise<void>;
}
