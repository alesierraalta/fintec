/**
 * Icon/Emoji mapping helpers for domain entities (Categories, Accounts)
 */

export const getCategoryEmoji = (icon?: string | null): string => {
  if (!icon) return '💰';
  const emojiMap: Record<string, string> = {
    Utensils: '🍽️',
    Car: '🚗',
    ShoppingBag: '🛍️',
    Music: '🎵',
    Stethoscope: '🩺',
    Home: '🏠',
    Book: '📚',
    Dumbbell: '🏋️',
    Plane: '✈️',
    Smartphone: '📱',
    Calendar: '📅',
    Banknote: '💵',
    Heart: '❤️',
    Zap: '⚡',
    Building2: '🏢',
    Receipt: '🧾',
    Briefcase: '💼',
    Coffee: '☕',
    TrendingUp: '📈',
    Gift: '🎁',
    Star: '⭐',
    Repeat: '🔄',
    PiggyBank: '🐷',
  };
  return emojiMap[icon] || '💰';
};

export const getAccountEmoji = (type?: string | null): string => {
  if (!type) return '💰';
  const emojiMap: Record<string, string> = {
    BANK: '🏦',
    CARD: '💳',
    CASH: '💵',
    INVESTMENT: '📈',
  };
  return emojiMap[type] || '💰';
};
