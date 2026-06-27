import type { SubscriptionTier, PublicationStatus, Currency, NotificationType } from "@/types";

export const PLAN_LIMITS: Record<
  SubscriptionTier,
  { maxFlyers: number; maxCustomRoles: number; maxEmployees: string }
> = {
  Gratuito: { maxFlyers: 5, maxCustomRoles: 0, maxEmployees: "1 admin" },
  Comercial: { maxFlyers: 25, maxCustomRoles: 1, maxEmployees: "3-5" },
  Corporativo: {
    maxFlyers: 150,
    maxCustomRoles: 3,
    maxEmployees: "Ilimitados",
  },
};

export const PUBLICATION_STATES: Record<
  PublicationStatus,
  { label: string; color: string }
> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  published: { label: "Publicado", color: "bg-blue-100 text-blue-700" },
  pending_review: {
    label: "En Revisión",
    color: "bg-yellow-100 text-yellow-700",
  },
  concluded: { label: "Concluido", color: "bg-amber-100 text-amber-700" },
  archived: { label: "Archivado", color: "bg-gray-200 text-gray-500" },
};

export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "MXN", label: "Peso Mexicano (MXN)" },
  { value: "USD", label: "Dólar Americano (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
];

export const REGIONS = [
  "Caribe Mexicano",
  "Riviera Maya",
  "Los Cabos",
  "Puerto Vallarta",
  "Ciudad de México",
  "Oaxaca",
  "Guanajuato",
  "Yucatán",
  "Quintana Roo",
  "Jalisco",
  "Europa",
  "Sudamérica",
  "Centroamérica",
  "Asia",
  "África",
  "Otro",
] as const;

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  new_message: "MessageSquare",
  payment_received: "CreditCard",
  package_reported: "AlertTriangle",
  package_approved: "CheckCircle",
  package_banned: "XCircle",
  order_cancelled: "Ban",
};

export const INTEREST_TAGS = [
  "Aventura",
  "Playa",
  "Cultural",
  "Gastronómico",
  "Romántico",
  "Familiar",
  "Ecoturismo",
  "Deportivo",
  "Relax y Bienestar",
  "Nocturna",
  "Histórico",
  "Naturaleza",
] as const;

export const BUDGET_RANGES = [
  { value: "Bajo", label: "Económico (bajo $10,000 MXN)" },
  { value: "Medio", label: "Moderado ($10,000 - $30,000 MXN)" },
  { value: "Alto", label: "Premium ($30,000 - $80,000 MXN)" },
  { value: "Premium", label: "Lujo (más de $80,000 MXN)" },
] as const;

export const PLATFORM_COMMISSION_RATE = 0.03;
export const MIN_DEPOSIT_PERCENTAGE = 0.2;
export const MAX_DEFERRED_MONTHS = 4;
export const GRACE_PERIOD_DAYS = 14;
export const MAX_CENSORSHIP_STRIKES = 5;
export const AI_DAILY_LIMIT = 5;
export const AI_PER_MINUTE_LIMIT = 3;
