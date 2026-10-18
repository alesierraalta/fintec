'use client';

import { toast } from 'sonner';
import type { AppRepository } from '@/repositories/contracts';
import type { CreateTransactionDTO } from '@/types/domain';
import { runFinancialMutation } from '@/lib/finance/financial-data-sync';

export async function saveTransactions({
  userId,
  repository,
  transactions,
  exchangeRate,
}: {
  userId?: string;
  repository: AppRepository;
  transactions: CreateTransactionDTO[];
  exchangeRate: number;
}): Promise<{ saved: number; complete: boolean }> {
  if (
    transactions.some((tx) => tx.currencyCode === 'VES') &&
    !(exchangeRate > 0)
  ) {
    toast.error(
      'No se pudo obtener la tasa de cambio. Asegurate de que las tasas BCV/Binance estén actualizadas.'
    );
    return { saved: 0, complete: false };
  }
  let saved = 0;
  let failed = false;
  try {
    await runFinancialMutation({
      userId,
      repository,
      domains: ['transactions', 'accounts', 'budgets'],
      mutation: async () => {
        for (const dto of transactions) {
          try {
            await repository.transactions.create({
              ...dto,
              exchangeRate:
                dto.currencyCode === 'VES' ? exchangeRate : undefined,
            });
            saved++;
          } catch {
            failed = true;
            break;
          }
        }
      },
    });
    if (failed)
      toast.error(
        `Se guardaron ${saved} de ${transactions.length} transacciones. No se guardaron las restantes.`
      );
    else toast.success(`${saved} transacciones guardadas`);
  } catch {
    failed = true;
    toast.error(
      `Se guardaron ${saved} de ${transactions.length} transacciones. No se pudo completar el registro.`
    );
  }
  return { saved, complete: !failed };
}
