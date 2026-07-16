import type { ItineraryData, CRMLeadStatus } from "./database";

export interface PresignedUrlResponse {
  signedUrl: string;
  path: string;
}

export interface CreateRoleRequest {
  role_name: string;
  can_manage_catalog: boolean;
  can_view_global_leads: boolean;
  can_manage_finance: boolean;
  can_manage_chat: boolean;
}

export interface CreateRoleResponse {
  role_id: string;
  tenant_id: string;
  role_name: string;
  can_manage_catalog: boolean;
  can_view_global_leads: boolean;
  can_manage_finance: boolean;
  can_manage_chat: boolean;
  created_at: string;
}

export interface GenerateItineraryRequest {
  package_id: string;
  cluster_interests_hash?: string;
}

export type GenerateItineraryResponse = ItineraryData;

export interface CreateCheckoutRequest {
  package_id: string;
  currency?: string;
}

export interface CreateCheckoutResponse {
  id: string;
  url: string;
  amount_total: number;
  currency: string;
  platform_fee: number;
  target_amount?: number;
  package_id?: string;
  tenant_id?: string;
  stripe_account_id?: string;
  note?: string;
}

export interface ReportPackageRequest {
  package_id: string;
  reason: string;
}

export interface ReportPackageResponse {
  success: boolean;
  report_id: string;
}

export interface ReviewPackageRequest {
  report_id: string;
  decision: "approve" | "ban";
  notes?: string;
}

export interface ReviewPackageResponse {
  success: boolean;
  decision: string;
}

export interface ApiError {
  error: string;
}

export interface CreateLeadRequest {
  package_id: string;
  traveler_user_id?: string;
}

export interface CreateLeadResponse {
  lead_id: string;
  conversation_id: string;
  assigned_to: string | null;
}

export interface AIQualifyLeadRequest {
  lead_id: string;
  conversation_id: string;
  latest_message: string;
}

export interface AIQualifyLeadResponse {
  reply: string;
  extracted_fields: Record<string, unknown>;
  should_transfer_to_human: boolean;
  qualification_completed: boolean;
}

export interface AssignLeadRequest {
  lead_id: string;
  agent_id: string;
}

export interface UpdateLeadStatusRequest {
  lead_id: string;
  status: CRMLeadStatus;
}

export interface AddLeadActivityRequest {
  lead_id: string;
  activity_type: "note";
  description: string;
}

export interface TransferLeadToHumanRequest {
  lead_id: string;
  conversation_id: string;
}

export interface CreateConnectAccountResponse {
  url: string;
  account_id?: string;
}

export interface ManageSubscriptionRequest {
  action: "create" | "portal";
  plan?: string;
  billing_cycle?: "monthly" | "annual";
}

export interface ManageSubscriptionResponse {
  url: string;
}

export interface GenerateCfdiRequest {
  concept: string;
  amount: number;
  currency?: string;
  tenant_id: string;
}

export interface GenerateCfdiResponse {
  cfdi_id: string;
  uuid: string;
  pdf_url: string;
  xml_url: string;
}

export interface DispatchNotificationRequest {
  user_id: string;
  type: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}
