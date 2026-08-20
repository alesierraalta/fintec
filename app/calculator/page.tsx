import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import CalculatorClient from './calculator-client';

export const metadata: Metadata = {
  title: 'Calculadora VES | FinTec',
  description: 'Convierte entre VES, USD, EUR y BUSD con tasas BCV y Binance. Historial de 30 días.',
};

export default async function CalculatorPage() {
  await requireAuthenticatedUser();
  return <CalculatorClient />;
}
