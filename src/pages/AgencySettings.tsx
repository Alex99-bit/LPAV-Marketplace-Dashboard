import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { AgencyTenant, SaasSubscription } from "@/types";
import Spinner from "@/components/ui/Spinner";
import CompanyProfileForm from "@/components/agency/CompanyProfileForm";
import FiscalDocuments from "@/components/agency/FiscalDocuments";
import TeamManagement from "@/components/agency/TeamManagement";
import PlanManagement from "@/components/agency/PlanManagement";
import StripeConnectStatus from "@/components/agency/StripeConnectStatus";

export default function AgencySettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<AgencyTenant | null>(null);
  const [subscription, setSubscription] = useState<SaasSubscription | null>(null);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    const tenantId = profile.tenant_id!;

    const [tenantRes, subRes] = await Promise.all([
      supabase.from("agencies_tenants").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("saas_subscriptions").select("*").eq("tenant_id", tenantId).single(),
    ]);

    setTenant(tenantRes.data as AgencyTenant | null);
    setSubscription(subRes.data as SaasSubscription | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile?.tenant_id]);

  if (loading || !tenant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-text">Configuración</h1>

      <div className="space-y-6">
        <CompanyProfileForm tenant={tenant} onSave={fetchData} />
        <StripeConnectStatus
          stripeAccountId={tenant.stripe_account_id}
        />
        <FiscalDocuments tenant={tenant} />
        <TeamManagement tenantId={tenant.tenant_id} />
        <PlanManagement
          subscription={subscription}
          currentTier={tenant.subscription_tier}
        />
      </div>
    </div>
  );
}
