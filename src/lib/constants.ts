import type { PlanType, PublicationStatus, Currency, NotificationType, CRMLeadStatus } from "@/types";

export const PLAN_LIMITS: Record<
  PlanType,
  { maxFlyers: number; maxCustomRoles: number; maxEmployees: string }
> = {
  Básico: { maxFlyers: 50, maxCustomRoles: 0, maxEmployees: "1 admin" },
  Intermedio: { maxFlyers: 50, maxCustomRoles: 1, maxEmployees: "3-5" },
  Premium: { maxFlyers: 50, maxCustomRoles: 3, maxEmployees: "Ilimitados" },
  Fundador: { maxFlyers: 50, maxCustomRoles: 3, maxEmployees: "Ilimitados" },
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

export const DEPARTURE_CITIES = [
  "Ciudad de México (CDMX)",
  "Monterrey (MTY)",
  "Guadalajara (GDL)",
  "San Luis Potosí (SLP)",
  "Cancún (CUN)",
  "Mérida (MID)",
  "Tijuana (TIJ)",
  "Puebla (PBC)",
  "Querétaro (QRO)",
  "León / Bajío (BJX)",
  "Toluca (TLC)",
  "Veracruz (VER)",
  "Villahermosa (VSA)",
  "Hermosillo (HMO)",
  "Culiacán (CUL)",
  "Chihuahua (CUU)",
  "Aguascalientes (AGU)",
  "Morelia (MLM)",
  "Oaxaca (OAX)",
  "Tuxtla Gutiérrez (TGZ)",
  "La Paz (LAP)",
  "Puerto Vallarta (PVR)",
  "Los Cabos (SJD)",
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

/* Plan features y precios — fuente unica. PLAN_LIMITS (arriba) define
   los limites numericos; PLAN_DETAILS define el copy de cara al usuario,
   precios, y tasas de comision. AgenciaAuth y PlanManagement consumen ambas constantes. */
export const PLAN_DETAILS: Record<
  PlanType,
  { label: string; price: string; commission: string; commissionNote: string; features: string[]; recommended?: boolean }
> = {
  Básico: {
    label: "Plan Básico",
    price: "$0/mes",
    commission: "20%",
    commissionNote: "Tasa fija",
    features: [
      `${PLAN_LIMITS.Básico.maxFlyers} flyers publicados`,
      "Sin roles personalizados",
      "1 cuenta de administrador",
      "Soporte estándar",
    ],
  },
  Intermedio: {
    label: "Plan Intermedio",
    price: "$1,799/mes",
    commission: "18% (pref. 17%)",
    commissionNote: "≥5% conversión → 17%",
    features: [
      `${PLAN_LIMITS.Intermedio.maxFlyers} flyers publicados`,
      "1 rol personalizado (Agentes de Ventas)",
      "3-5 colaboradores",
      "Logo distintivo en marketplace",
      "Referidos por Avimo",
      "Bots de pre-calificación de leads",
      "Agente IA de seguimiento",
      "Soporte estándar",
    ],
    recommended: true,
  },
  Premium: {
    label: "Plan Premium",
    price: "$2,999/mes",
    commission: "15% (pref. 12%)",
    commissionNote: "≥8% conversión → 12%",
    features: [
      `${PLAN_LIMITS.Premium.maxFlyers} flyers publicados`,
      "3 roles personalizados",
      "Colaboradores ilimitados",
      "Logo distintivo en marketplace",
      "Referidos por Avimo",
      "Apartado completo en marketplace",
      "Dashboard avanzado con KPIs",
      "Soporte 24/7",
    ],
  },
  Fundador: {
    label: "Plan Fundador",
    price: "$0/mes",
    commission: "7.5%",
    commissionNote: "Tasa fija — 10 plazas",
    features: [
      `${PLAN_LIMITS.Fundador.maxFlyers} flyers publicados`,
      "3 roles personalizados",
      "Colaboradores ilimitados",
      "Todos los beneficios Premium",
      "Logo distintivo",
      "Apartado completo",
      "Soporte 24/7",
    ],
  },
};
export const IVA_RATE = 0.16;
export const PLAN_COMMISSION_RATES: Record<PlanType, number> = {
  Básico: 0.20,
  Intermedio: 0.18,
  Premium: 0.15,
  Fundador: 0.075,
};
export const PLAN_PREFERENTIAL_RATES: Partial<Record<PlanType, number>> = {
  Intermedio: 0.17,
  Premium: 0.12,
};
export const PLAN_PREFERENTIAL_THRESHOLDS: Partial<Record<PlanType, number>> = {
  Intermedio: 5,
  Premium: 8,
};
export const STRIPE_FEE_RATE = 0.036;
export const STRIPE_FEE_FIXED = 3;
export const MIN_DEPOSIT_PERCENTAGE = 0.2;
export const MAX_DEFERRED_MONTHS = 4;
export const GRACE_PERIOD_DAYS = 15;
export const MAX_CENSORSHIP_STRIKES = 5;
export const AI_DAILY_LIMIT = 5;
export const AI_PER_MINUTE_LIMIT = 3;

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
