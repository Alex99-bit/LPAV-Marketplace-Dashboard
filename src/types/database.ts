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
  owner_user_id: string | null;
  status: AgencyStatus;
  plan_type: PlanType;
  commission_rate: number;
  conversion_window_leads: number;
  conversion_window_sales: number;
  conversion_rate: number | null;
  preferential_rate_active: boolean;
  consecutive_months_below_threshold: number;
  verification_status: VerificationStatus;
  contract_signed_at: string | null;
  contract_pdf_url: string | null;
  years_of_service: number | null;
  has_physical_location: boolean;
  accept_no_refunds: boolean;
  accept_ai_data_usage: boolean;
  accept_nda: boolean;
  accept_iva_disclaimer: boolean;
  legal_acceptances_at: string | null;
  overbooking_incidents: number;
  fundador_request_status: FundadorRequestStatus;
  fundador_requested_at: string | null;
  fundador_activated_at: string | null;
  fundador_continuity_pending: boolean;
  fundador_continuity_active: boolean;
  trial_used_at: string | null;
  created_at: string;
}

export type AgencyStatus = "En Revisión" | "Activo" | "Suspendido por Pago" | "Suspendido por Fraude";
export type PlanType = "Básico" | "Intermedio" | "Premium" | "Fundador";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type FundadorRequestStatus = "none" | "pending" | "approved" | "rejected";

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
  avatar_url: string | null;
  phone: string | null;
  censorship_strikes: number;
  created_at: string;
}

export interface AgencyInvitation {
  invitation_id: string;
  tenant_id: string;
  invited_by: string | null;
  email: string;
  role_name: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type AuthIntent =
  | "traveler_login"
  | "traveler_register"
  | "agency_login"
  | "agency_register";

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
  departure_city: string;
  description?: string;
  total_rooms: number;
  available_rooms: number;
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
  package_total_amount: number;
  paid_amount: number;
  remaining_balance: number;
  deposit_percent: number;
  currency: Currency;
  platform_commission_fee: number;
  payment_processing_fee: number;
  payment_processing_fee_iva: number;
  stripe_fee_actual: number | null;
  package_subtotal: number;
  package_iva: number;
  points_earned: number;
  points_redeemed: number;
  payment_status: PaymentStatus;
  cancellation_status: CancellationStatus;
  cancellation_reason: CancellationReason | null;
  cancellation_requested_at: string | null;
  cancellation_penalty: number;
  refund_amount: number;
  agency_debit: number;
  policy_version: string;
  next_payment_due: string | null;
  created_at: string;
}

export type PaymentStatus =
  | "pending"
  | "partial_paid"
  | "paid"
   | "moroso"
   | "cancelled"
   | "refunded"
  | "partially_refunded";

export type CancellationStatus = "not_requested" | "pending" | "processed" | "failed";
export type CancellationReason = "traveler_request" | "agency_cancelled" | "force_majeure";

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
  message_type: ChatMessageType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type ChatMessageType = "text" | "payment_request" | "payment_confirmed";

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

export interface StripeAccount {
  stripe_account_id: string;
  tenant_id: string;
  account_type: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_status: string;
  created_at: string;
}

export interface InstallmentSchedule {
  installment_id: string;
  order_id: string;
  installment_number: number;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  paid_at: string | null;
  stripe_checkout_url: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  reminder_sent_at: string | null;
  created_at: string;
}

export interface SaasSubscription {
  subscription_id: string;
  tenant_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan_tier: PlanType;
  billing_cycle: "monthly" | "annual";
  status: "active" | "past_due" | "cancelled" | "trialing";
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_end: string | null;
  created_at: string;
}

export interface TravelerDocument {
  document_id: string;
  order_id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export interface RoomingList {
  rooming_id: string;
  order_id: string;
  generated_by: string;
  file_url: string;
  generated_at: string;
}

export interface TravelIncident {
  incident_id: string;
  order_id: string;
  reported_by: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface PackageReview {
  review_id: string;
  package_id: string;
  order_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "published" | "hidden";
  created_at: string;
}

export interface NotificationPreference {
  pref_id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  email_payment_reminders: boolean;
  email_chat_notifications: boolean;
  email_marketing: boolean;
  created_at: string;
}

export interface AgencyTeamMember {
  member_id: string;
  tenant_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role_name: string;
  status: "active" | "invited" | "deactivated";
  invited_at: string;
  joined_at: string | null;
}

export interface FiscalIncomeRecord {
  income_id: string;
  order_id: string | null;
  tenant_id: string | null;
  concept: string;
  income_type: "agency_commission";
  subtotal: number;
  iva_amount: number;
  total: number;
  currency: string;
  stripe_fee: number;
  stripe_fee_iva: number;
  cfdi_status: "pending" | "issued" | "cancelled";
  cfdi_uuid: string | null;
  cfdi_pdf_url: string | null;
  cfdi_xml_url: string | null;
  commission_rate_applied: number | null;
  recorded_at: string;
  fiscal_period_id: string | null;
}

export interface FiscalExpenseRecord {
  expense_id: string;
  concept: string;
  expense_category: "infrastructure" | "ai_api" | "salaries" | "rent" | "software" | "marketing" | "legal_accounting" | "stripe_fees" | "other";
  provider_name: string | null;
  provider_rfc: string | null;
  subtotal: number;
  iva_amount: number;
  total: number;
  currency: string;
  cfdi_status: "pending" | "received" | "verified";
  cfdi_uuid: string | null;
  cfdi_pdf_url: string | null;
  notes: string | null;
  recorded_by: string | null;
  tenant_id: string | null;
  created_by: string | null;
  recorded_at: string;
  fiscal_period_id: string | null;
}

export interface FiscalPeriod {
  period_id: string;
  period_type: "monthly" | "quarterly" | "annual";
  period_label: string;
  period_start: string;
  period_end: string;
  total_income_subtotal: number;
  total_income_iva: number;
  total_expense_subtotal: number;
  total_expense_iva: number;
  iva_to_declare: number;
  isr_base: number;
  status: "open" | "closed" | "declared";
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface UserWallet {
  wallet_id: string;
  user_id: string;
  points_balance: number;
  max_balance_reached: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  transaction_id: string;
  wallet_id: string;
  user_id: string;
  type: "earn" | "redeem" | "reversal" | "bonus" | "referral" | "review";
  points: number;
  description: string | null;
  reference_order_id: string | null;
  created_at: string;
}

export interface ExternalSale {
  sale_id: string;
  tenant_id: string;
  package_id: string | null;
  rooms_sold: number;
  total_amount: number | null;
  currency: string;
  sale_date: string;
  notes: string | null;
  created_at: string;
}

export interface InventoryPool {
  pool_id: string;
  tenant_id: string;
  pool_name: string;
  total_units: number;
  available_units: number;
  created_at: string;
}

export interface PackageInventoryLink {
  link_id: string;
  package_id: string;
  pool_id: string;
  allocated_units: number;
}

export interface InventoryAuditLog {
  audit_id: string;
  package_id: string;
  pool_id: string | null;
  change_type: "booking" | "external_sale" | "manual_adjustment" | "sync" | "dispute_reversal";
  rooms_before: number;
  rooms_after: number;
  changed_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface InventoryHold {
  hold_id: string;
  package_id: string;
  user_id: string;
  units_held: number;
  expires_at: string;
  status: "active" | "released" | "consumed";
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      agencies_tenants: { Row: AgencyTenant; Insert: Partial<AgencyTenant>; Update: Partial<AgencyTenant> };
      custom_roles_permissions: { Row: CustomRolePermission; Insert: Partial<CustomRolePermission>; Update: Partial<CustomRolePermission> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      agency_invitations: { Row: AgencyInvitation; Insert: Partial<AgencyInvitation>; Update: Partial<AgencyInvitation> };
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
      stripe_accounts: { Row: StripeAccount; Insert: Partial<StripeAccount>; Update: Partial<StripeAccount> };
      installment_schedules: { Row: InstallmentSchedule; Insert: Partial<InstallmentSchedule>; Update: Partial<InstallmentSchedule> };
      saas_subscriptions: { Row: SaasSubscription; Insert: Partial<SaasSubscription>; Update: Partial<SaasSubscription> };
      traveler_documents: { Row: TravelerDocument; Insert: Partial<TravelerDocument>; Update: Partial<TravelerDocument> };
      rooming_lists: { Row: RoomingList; Insert: Partial<RoomingList>; Update: Partial<RoomingList> };
      travel_incidents: { Row: TravelIncident; Insert: Partial<TravelIncident>; Update: Partial<TravelIncident> };
      package_reviews: { Row: PackageReview; Insert: Partial<PackageReview>; Update: Partial<PackageReview> };
      notification_preferences: { Row: NotificationPreference; Insert: Partial<NotificationPreference>; Update: Partial<NotificationPreference> };
      agency_team_members: { Row: AgencyTeamMember; Insert: Partial<AgencyTeamMember>; Update: Partial<AgencyTeamMember> };
      user_wallets: { Row: UserWallet; Insert: Partial<UserWallet>; Update: Partial<UserWallet> };
      wallet_transactions: { Row: WalletTransaction; Insert: Partial<WalletTransaction>; Update: Partial<WalletTransaction> };
      fiscal_income_records: { Row: FiscalIncomeRecord; Insert: Partial<FiscalIncomeRecord>; Update: Partial<FiscalIncomeRecord> };
      fiscal_expense_records: { Row: FiscalExpenseRecord; Insert: Partial<FiscalExpenseRecord>; Update: Partial<FiscalExpenseRecord> };
      fiscal_periods: { Row: FiscalPeriod; Insert: Partial<FiscalPeriod>; Update: Partial<FiscalPeriod> };
      external_sales_log: { Row: ExternalSale; Insert: Partial<ExternalSale>; Update: Partial<ExternalSale> };
      inventory_pools: { Row: InventoryPool; Insert: Partial<InventoryPool>; Update: Partial<InventoryPool> };
      package_inventory_link: { Row: PackageInventoryLink; Insert: Partial<PackageInventoryLink>; Update: Partial<PackageInventoryLink> };
      inventory_audit_log: { Row: InventoryAuditLog; Insert: Partial<InventoryAuditLog>; Update: Partial<InventoryAuditLog> };
      inventory_holds: { Row: InventoryHold; Insert: Partial<InventoryHold>; Update: Partial<InventoryHold> };
      platform_settings: { Row: PlatformSetting; Insert: Partial<PlatformSetting>; Update: Partial<PlatformSetting> };
    };
  };
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  updated_at: string;
}
