import { notFound } from 'next/navigation';
import { TransactionSwipeHarness } from '@/components/testing/transaction-swipe-harness';

export default function TransactionSwipeHarnessPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <TransactionSwipeHarness />;
}
