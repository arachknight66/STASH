// Default demo user ID — swap for real auth when ready
export const DEMO_USER_ID_KEY = 'stash-user-id';

export const CATEGORY_META: Record<string, { label: string; emoji: string; icon: string }> = {
  FOOD:          { label: 'Food',          emoji: '🍔', icon: 'restaurant' },
  DRIP:          { label: 'Drip',          emoji: '👟', icon: 'shopping_bag' },
  ENTERTAINMENT: { label: 'Entertainment', emoji: '🎮', icon: 'movie' },
  TRANSPORT:     { label: 'Transport',     emoji: '🚌', icon: 'directions_transit' },
  BILLS:         { label: 'Bills',         emoji: '🧾', icon: 'receipt' },
  COFFEE:        { label: 'Coffee',        emoji: '☕', icon: 'local_cafe' },
  SAVINGS:       { label: 'Savings',       emoji: '💰', icon: 'savings' },
  INCOME:        { label: 'Income',        emoji: '💵', icon: 'payments' },
  OTHER:         { label: 'Other',         emoji: '📦', icon: 'category' },
};

export const BUCKET_THEME_CLASSES: Record<string, {
  card: string;
  iconWrap: string;
  fill: string;
  accent: string;
  surface: string;
}> = {
  PRIMARY:   { card: 'bg-primary-container',   iconWrap: 'bg-white', fill: 'bg-tertiary',          accent: 'text-secondary', surface: 'bg-white' },
  SECONDARY: { card: 'bg-secondary-container', iconWrap: 'bg-white', fill: 'bg-secondary',         accent: 'text-tertiary',  surface: 'bg-white' },
  TERTIARY:  { card: 'bg-tertiary-container',  iconWrap: 'bg-white', fill: 'bg-primary',           accent: 'text-primary',   surface: 'bg-white' },
  NEUTRAL:   { card: 'bg-white',               iconWrap: 'bg-surface-container', fill: 'bg-inverse-surface', accent: 'text-primary', surface: 'bg-surface-container' },
};
