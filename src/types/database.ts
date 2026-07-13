export interface AgencyTenant {
  tenant_id: string;
  business_name: string;
  rfc: string;
  address_text: string;
  fiscal_pdf_url: string;
  certification_key: string;
  stripe_account_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: AgencyStatus;
  subscription_tier: SubscriptionTier;
  created_at: string;
}

export type AgencyStatus = "En Revisión" | "Activo" | "Suspendido por Pago";
export type SubscriptionTier = "Gratuito" | "Comercial" | "Corporativo";

export interface CustomRolePermission {
  role_id: string;
  tenant_id: string;
  role_name: string;
  can_manage_catalog: boolean;
  can_view_global_leads: boolean;
  can_manage_finance: boolean;
  can_manage_chat: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string | null;
  role_name: string;
  censorship_strikes: number;
  created_at: string;
}

export interface TravelPackage {
  package_id: string;
  tenant_id: string;
  title: string;
  region: string;
  price: number;
  currency: Currency;
  url_flyer_storage: string;
  url_thumbnail_storage: string;
  has_coordinator: boolean;
  publication_status: PublicationStatus;
  departure_date: string;
  created_at: string;
}

export type PublicationStatus =
  | "draft"
  | "published"
  | "archived"
  | "concluded"
  | "pending_review";

export type Currency = "MXN" | "USD" | "EUR";

export interface TransactionOrder {
  order_id: string;
  tenant_id: string;
  stripe_checkout_session_id: string;
  user_id: string;
  total_amount: number;
  remaining_balance: number;
  currency: Currency;
  platform_commission_fee: number;
  payment_status: PaymentStatus;
  next_payment_due: string | null;
  created_at: string;
}

export type PaymentStatus =
  | "pending"
  | "partial_paid"
  | "paid"
  | "moroso"
  | "cancelled";

export interface UserRecommendationProfile {
  user_id: string;
  onboarding_completed: boolean;
  cluster_interests_hash: string;
  preferred_destinations: string[] | null;
  target_budget_range: BudgetRange | null;
  updated_at: string;
}

export type BudgetRange = "Bajo" | "Medio" | "Alto" | "Premium";

export interface CachedItinerary {
  cache_id: string;
  package_id: string;
  cluster_interests_hash: string;
  itinerary_json: ItineraryData;
  created_at: string;
}

export interface ItineraryData {
  title: string;
  totalDays: number;
  description?: string;
  days: ItineraryDay[];
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  activities: ItineraryActivity[];
}

export interface ItineraryActivity {
  time: string;
  description: string;
  location?: string;
}

export interface UserBehaviorLog {
  log_id: string;
  visitor_tracker_id: string | null;
  user_id: string | null;
  event_type: BehaviorEventType;
  package_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type BehaviorEventType =
  | "view_package"
  | "search_query"
  | "add_to_cart"
  | "generate_itinerary"
  | "rate_limit_ban";

export interface ChatMessage {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

export interface PackageReport {
  report_id: string;
  package_id: string;
  reporter_id: string | null;
  reason: string;
  status: ReportStatus;
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export type ReportStatus = "pending" | "reviewed" | "dismissed";

export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type NotificationType =
  | "new_message"
  | "payment_received"
  | "package_reported"
  | "package_approved"
  | "package_banned"
  | "order_cancelled";

export interface CRMLead {
  lead_id: string;
  tenant_id: string;
  traveler_user_id: string | null;
  package_id: string | null;
  assigned_to: string | null;
  status: CRMLeadStatus;
  source: CRMLeadSource;
  priority: CRMPriority;
  number_of_travelers: number | null;
  preferred_travel_dates: string | null;
  estimated_budget: number;
  budget_currency: Currency;
  travel_type: string | null;
  traveler_origin: string | null;
  preferred_airline: string | null;
  accommodation_type: string | null;
  special_requirements: string | null;
  ai_qualification_progress: Record<string, unknown>;
  ai_qualification_completed: boolean;
  conversation_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CRMLeadStatus = "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";
export type CRMLeadSource = "marketplace" | "chat" | "referral" | "other";
export type CRMPriority = "low" | "medium" | "high";

export interface CRMActivity {
  activity_id: string;
  lead_id: string;
  agent_id: string | null;
  activity_type: CRMActivityType;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type CRMActivityType = "note" | "status_change" | "assignment" | "created" | "ai_extraction";

export interface CRMAIQualificationSession {
  session_id: string;
  lead_id: string;
  conversation_id: string;
  fields_extracted: Record<string, unknown>;
  fields_pending: string[];
  status: "active" | "completed" | "abandoned";
  created_at: string;
  completed_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      agencies_tenants: { Row: AgencyTenant; Insert: Partial<AgencyTenant>; Update: Partial<AgencyTenant> };
      custom_roles_permissions: { Row: CustomRolePermission; Insert: Partial<CustomRolePermission>; Update: Partial<CustomRolePermission> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      travel_packages: { Row: TravelPackage; Insert: Partial<TravelPackage>; Update: Partial<TravelPackage> };
      transactions_orders: { Row: TransactionOrder; Insert: Partial<TransactionOrder>; Update: Partial<TransactionOrder> };
      user_recommendation_profiles: { Row: UserRecommendationProfile; Insert: Partial<UserRecommendationProfile>; Update: Partial<UserRecommendationProfile> };
      cached_itineraries: { Row: CachedItinerary; Insert: Partial<CachedItinerary>; Update: Partial<CachedItinerary> };
      user_behavior_logs: { Row: UserBehaviorLog; Insert: Partial<UserBehaviorLog>; Update: Partial<UserBehaviorLog> };
      chat_messages: { Row: ChatMessage; Insert: Partial<ChatMessage>; Update: Partial<ChatMessage> };
      package_reports: { Row: PackageReport; Insert: Partial<PackageReport>; Update: Partial<PackageReport> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      crm_leads: { Row: CRMLead; Insert: Partial<CRMLead>; Update: Partial<CRMLead> };
      crm_activities: { Row: CRMActivity; Insert: Partial<CRMActivity>; Update: Partial<CRMActivity> };
      crm_ai_qualification_sessions: { Row: CRMAIQualificationSession; Insert: Partial<CRMAIQualificationSession>; Update: Partial<CRMAIQualificationSession> };
    };
  };
}
