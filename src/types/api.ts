import type { ItineraryData } from "./database";

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
