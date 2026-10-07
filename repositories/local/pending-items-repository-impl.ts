import type {
  PendingItem,
  PendingItemKind,
  CreatePendingItemDTO,
  UpdatePendingItemDTO,
} from '@/types/pending-item';
import type { PendingItemsRepository } from '@/repositories/contracts/pending-items-repository';
import { db } from './db';

export class LocalPendingItemsRepository implements PendingItemsRepository {
  async findByUser(userId: string): Promise<PendingItem[]> {
    const rows = await db.pendingItems.where('userId').equals(userId).toArray();
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async create(
    userId: string,
    data: CreatePendingItemDTO
  ): Promise<PendingItem> {
    const row: PendingItem = {
      id: crypto.randomUUID(),
      userId,
      kind: data.kind,
      name: data.name,
      amountBaseMinor: data.amountBaseMinor ?? null,
      done: false,
      doneAt: null,
      convertedTransactionId: null,
      createdAt: new Date().toISOString(),
    };
    await db.pendingItems.add(row);
    return row;
  }

  async update(id: string, data: UpdatePendingItemDTO): Promise<PendingItem> {
    const current = await db.pendingItems.get(id);
    if (!current) {
      throw new Error('Pending item not found');
    }

    const updated: PendingItem = {
      ...current,
      ...(data.done !== undefined
        ? {
            done: data.done,
            doneAt: data.done ? new Date().toISOString() : null,
          }
        : {}),
      ...(data.convertedTransactionId !== undefined
        ? { convertedTransactionId: data.convertedTransactionId }
        : {}),
    };
    await db.pendingItems.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.pendingItems.delete(id);
  }

  async deleteCompleted(userId: string, kind?: PendingItemKind): Promise<void> {
    await db.pendingItems
      .where('userId')
      .equals(userId)
      .and((item) => item.done && (!kind || item.kind === kind))
      .delete();
  }
}
