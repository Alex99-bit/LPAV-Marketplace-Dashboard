import { useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { SaasSubscription, SubscriptionTier } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface PlanManagementProps {
  subscription: SaasSubscription | null;
  currentTier: SubscriptionTier;
}

const PLANS: { name: SubscriptionTier; features: string[] }[] = [
  { name: "Gratuito", features: ["5 flyers", "0 roles custom", "1 admin"] },
  { name: "Comercial", features: ["25 flyers", "1 rol custom", "3-5 empleados", "CRM completo"] },
  { name: "Corporativo", features: ["150 flyers", "3 roles custom", "Empleados ilimitados", "Analíticas", "AI Agent"] },
];

export default function PlanManagement({ subscription, currentTier }: PlanManagementProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (plan: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "create", plan, billing_cycle: "monthly" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "portal" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Plan y Suscripción</h3>

      {subscription && (
        <div className="mt-3 flex items-center gap-3">
          <Badge variant="success">{subscription.plan_tier}</Badge>
          <span className="text-xs text-text-muted">
            {subscription.billing_cycle === "monthly" ? "Mensual" : "Anual"}
          </span>
          <button
            onClick={handlePortal}
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <CreditCard className="h-3.5 w-3.5" /> Portal de Facturación
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.name === currentTier;
          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-4 ${
                isCurrent ? "border-primary bg-primary/5" : "border-gray-100"
              }`}
            >
              <h4 className="font-semibold text-text">{plan.name}</h4>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-text-muted">{f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <Badge variant="info" className="mt-4">Plan Actual</Badge>
              ) : (
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpgrade(plan.name)}
                  loading={loading}
                >
                  {PLANS.indexOf({ name: currentTier, features: [] }) < PLANS.indexOf(plan)
                    ? "Mejorar"
                    : "Cambiar"}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
