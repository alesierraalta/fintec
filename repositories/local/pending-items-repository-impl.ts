import type {
  PendingItem,
  PendingItemKind,
  CreatePendingItemDTO,
  UpdatePendingItemDTO,
} from '@/types/pending-item';
import type { PendingItemsRepository } from '@/repositories/contracts/pending-items-repository';
import { db } from './db';
import { LocalTransactionsRepository } from './transactions-repository-impl';
import type { CreateTransactionDTO } from '@/types/domain';

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

  async settle(id: string, transaction: CreateTransactionDTO): Promise<string> {
    return db.transaction(
      'rw',
      [db.pendingItems, db.transactions, db.accounts],
      async () => {
        const pending = await db.pendingItems.get(id);
        if (!pending) throw new Error('Pending item not found');
        if (pending.done || pending.convertedTransactionId) {
          if (!pending.convertedTransactionId) {
            throw new Error(
              'Pending item is already completed without a transaction'
            );
          }
          return pending.convertedTransactionId;
        }
        if (
          !Number.isInteger(transaction.amountMinor) ||
          transaction.amountMinor <= 0
        ) {
          throw new Error(
            'Transaction amount must be a positive integer in minor units'
          );
        }
        const created = await new LocalTransactionsRepository().create(
          transaction
        );
        await db.pendingItems.update(id, {
          done: true,
          doneAt: new Date().toISOString(),
          convertedTransactionId: created.id,
        });
        return created.id;
      }
    );
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
