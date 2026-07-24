import type { SubscriptionTier, PublicationStatus, Currency, NotificationType, CRMLeadStatus } from "@/types";

export const PLAN_LIMITS: Record<
  SubscriptionTier,
  { maxFlyers: number; maxCustomRoles: number; maxEmployees: string }
> = {
  Gratuito: { maxFlyers: 3, maxCustomRoles: 0, maxEmployees: "1 admin" },
  Comercial: { maxFlyers: 20, maxCustomRoles: 1, maxEmployees: "3-5" },
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

/* Plan features y precios — fuente única. PLAN_LIMITS (arriba) define
   los límites numéricos; PLAN_DETAILS define el copy de cara al usuario
   y los precios. AgenciaAuth y PlanManagement consumen ambas constantes. */
export const PLAN_DETAILS: Record<
  SubscriptionTier,
  { label: string; price: string; features: string[]; recommended?: boolean }
> = {
  Gratuito: {
    label: "Básico (Gratuito)",
    price: "$0/mes",
    features: [
      `${PLAN_LIMITS.Gratuito.maxFlyers} flyers publicados`,
      "Sin roles personalizados",
      "1 cuenta de administrador",
    ],
  },
  Comercial: {
    label: "Comercial",
    price: "$499/mes",
    features: [
      `${PLAN_LIMITS.Comercial.maxFlyers} flyers publicados`,
      "1 rol personalizado (Agentes de Ventas)",
      "3-5 colaboradores",
      "Soporte prioritario",
    ],
    recommended: true,
  },
  Corporativo: {
    label: "Corporativo",
    price: "$1,499/mes",
    features: [
      `${PLAN_LIMITS.Corporativo.maxFlyers} flyers publicados`,
      "3 roles personalizados dinámicos",
      "Colaboradores ilimitados",
      "Matriz de permisos granulares",
      "Soporte dedicado",
    ],
    },
};
export const IVA_RATE = 0.16;
export const TRAVELER_SERVICE_FEE_RATE = 0.06;
export const AGENCY_COMMISSION_RATE = 0.08;
export const AGENCY_EFFECTIVE_RATE = 0.0928;
export const STRIPE_FEE_RATE = 0.041;
export const STRIPE_FEE_FIXED = 3;
export const MIN_DEPOSIT_PERCENTAGE = 0.2;
export const MAX_DEFERRED_MONTHS = 4;
export const GRACE_PERIOD_DAYS = 5;
export const MAX_CENSORSHIP_STRIKES = 5;
export const AI_DAILY_LIMIT = 5;
export const AI_PER_MINUTE_LIMIT = 3;

export const POINTS_PER_100_MXN = 1;
export const POINT_VALUE_MXN = 1;
export const MIN_REDEEM_POINTS = 200;
export const MAX_POINTS_PERCENT_PER_PURCHASE = 0.2;
export const MAX_WALLET_BALANCE = 15000;
export const WELCOME_BONUS_POINTS = 5;
export const REFERRAL_BONUS_POINTS = 2;
export const REVIEW_BONUS_POINTS = 1;
export const MAX_NEGATIVE_BALANCE = 200;

export const CRM_LEAD_STATUS: Record<
  CRMLeadStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }
> = {
  new: { label: "Nuevo", variant: "info" },
  contacted: { label: "Contactado", variant: "warning" },
  qualified: { label: "Cualificado", variant: "success" },
  proposal_sent: { label: "Propuesta enviada", variant: "default" },
  won: { label: "Ganado", variant: "success" },
  lost: { label: "Perdido", variant: "danger" },
};

export const CRM_LEAD_STATUS_OPTIONS = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "qualified", label: "Cualificado" },
  { value: "proposal_sent", label: "Propuesta enviada" },
  { value: "won", label: "Ganado" },
  { value: "lost", label: "Perdido" },
];

export const CRM_PRIORITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

export const CRM_TRAVEL_TYPES = [
  "Playa",
  "Aventura",
  "Cultural",
  "Familiar",
  "Lujo",
  "Mochilero",
  "Romantico",
  "Ecoturismo",
  "Gastronomico",
] as const;

export const CRM_ACCOMMODATION_TYPES = [
  "Hotel",
  "Hostel",
  "Airbnb",
  "Resort",
  "All-Inclusive",
] as const;
