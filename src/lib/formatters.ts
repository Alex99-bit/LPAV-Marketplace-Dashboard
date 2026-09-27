import type { Currency } from "@/types";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  MXN: "$",
  USD: "US$",
  EUR: "€",
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  MXN: "es-MX",
  USD: "en-US",
  EUR: "de-DE",
};

export function formatCurrency(
  amount: number,
  currency: Currency = "MXN",
): string {
  const locale = CURRENCY_LOCALES[currency] ?? "es-MX";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(utcDate: string): string {
  return new Date(utcDate).toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatRelativeTime(utcDate: string): string {
  const now = Date.now();
  const then = new Date(utcDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour < 24) return `hace ${diffHour}h`;
  if (diffDay < 7) return `hace ${diffDay}d`;
  return formatDate(utcDate);
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency] ?? "$";
}


