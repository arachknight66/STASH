export type CurrencyCode = 'USD' | 'EUR' | 'INR' | 'GBP';

export interface CurrencyMeta {
  code: CurrencyCode;
  label: string;
  locale: string;
  usdRate: number;
  symbol: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: 'USD', label: 'US Dollar',      locale: 'en-US', usdRate: 1,     symbol: '$'  },
  EUR: { code: 'EUR', label: 'Euro',            locale: 'en-IE', usdRate: 0.92,  symbol: '€'  },
  INR: { code: 'INR', label: 'Indian Rupee',    locale: 'en-IN', usdRate: 83.15, symbol: '₹'  },
  GBP: { code: 'GBP', label: 'British Pound',   locale: 'en-GB', usdRate: 0.79,  symbol: '£'  },
};

export function usdToDisplay(amountUsd: number, currency: CurrencyCode): number {
  return amountUsd * CURRENCIES[currency].usdRate;
}

export function displayToUsd(amountDisplay: number, currency: CurrencyCode): number {
  return amountDisplay / CURRENCIES[currency].usdRate;
}

export function formatMoney(
  amountUsd: number,
  currency: CurrencyCode,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {},
): string {
  const meta = CURRENCIES[currency];
  const amount = usdToDisplay(amountUsd, currency);
  const maxFrac = options.maximumFractionDigits ?? 2;
  const minFrac = options.minimumFractionDigits ?? Math.min(2, maxFrac);
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(amount);
}

export function formatCompactMoney(amountUsd: number, currency: CurrencyCode): string {
  const meta = CURRENCIES[currency];
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(usdToDisplay(amountUsd, currency));
}
