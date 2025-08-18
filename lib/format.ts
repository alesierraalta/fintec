// Optimized formatting utilities

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short'
});

export const formatCurrency = (amountMinor: number): string => 
  currencyFormatter.format(amountMinor / 100);

export const formatDate = (dateISO: string): string => 
  dateFormatter.format(new Date(dateISO));

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return shortDateFormatter.format(date);
};

export const formatMonth = (monthYYYYMM: string): string => {
  const year = monthYYYYMM.substring(0, 4);
  const month = monthYYYYMM.substring(4, 6);
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
};

export const formatPercentage = (value: number): string => 
  `${Math.round(value)}%`;

export const formatAmount = (amount: number): string => {
  const formatted = Math.abs(amount).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount > 0 ? `+$${formatted}` : `-$${formatted}`;
};
