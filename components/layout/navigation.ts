import {
  ArrowRightLeft,
  ArrowUpDown,
  Calculator,
  CreditCard,
  HandCoins,
  Home,
  MessageSquare,
  PieChart,
  Repeat,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Wallet,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
  href: string;
  mobileLabel: string;
  desktopLabel?: string;
  icon: LucideIcon;
  premium?: boolean;
};

export const mobilePrimaryNavigation: NavigationItem[] = [
  { href: '/', mobileLabel: 'Inicio', desktopLabel: 'Inicio', icon: Home },
  { href: '/accounts', mobileLabel: 'Cuentas', desktopLabel: 'Cuentas', icon: Wallet },
  { href: '/transactions', mobileLabel: 'Transacciones', desktopLabel: 'Gastos', icon: ArrowUpDown },
  { href: '/transfers', mobileLabel: 'Transferir', desktopLabel: 'Transferir', icon: ArrowRightLeft },
  { href: '/goals', mobileLabel: 'Metas', desktopLabel: 'Metas', icon: Target },
];

export const mobileSecondaryNavigation: NavigationItem[] = [
  { href: '/recurring', mobileLabel: 'Recurrentes', icon: Repeat },
  { href: '/categories', mobileLabel: 'Categorías', icon: PieChart },
  { href: '/budgets', mobileLabel: 'Presupuestos', icon: CreditCard },
  { href: '/reports', mobileLabel: 'Reportes', icon: TrendingUp },
  { href: '/calculator', mobileLabel: 'Calculadora', icon: Calculator },
  { href: '/debts', mobileLabel: 'Deudas', icon: HandCoins },
  { href: '/p2p-offers', mobileLabel: 'Ofertas P2P', icon: DollarSign },
  { href: '/backups', mobileLabel: 'Respaldos', icon: Shield },
  { href: '/chat', mobileLabel: 'Chat', icon: MessageSquare, premium: true },
  { href: '/settings', mobileLabel: 'Ajustes', icon: Settings },
];

export const mobileAdminNavigation: NavigationItem = {
  href: '/admin', mobileLabel: 'Admin', icon: Shield,
};
