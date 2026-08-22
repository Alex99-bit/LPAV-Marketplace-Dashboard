import { useState } from "react";
import { CreditCard, CheckCircle2, Star, Zap, Crown, Heart } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_DETAILS } from "@/lib/constants";
import type { PlanType } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface PlanManagementProps {
  currentTier: PlanType;
  currentCommissionRate?: number;
  preferentialRateActive?: boolean;
}

const PLAN_ICONS: Record<PlanType, typeof Star> = {
  Básico: Star,
  Intermedio: Zap,
  Premium: Crown,
  Fundador: Heart,
};

export default function PlanManagement({
  currentTier,
  currentCommissionRate,
  preferentialRateActive,
}: PlanManagementProps) {
  const [loading, setLoading] = useState<PlanType | null>(null);

  const handleChangePlan = async (plan: PlanType) => {
    if (plan === currentTier) return;
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "change_plan", plan },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.success) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Error al cambiar de plan:", err);
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading(currentTier);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "portal" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const tierOrder: PlanType[] = ["Básico", "Intermedio", "Premium", "Fundador"];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text">Plan y Comisión</h3>
          <p className="mt-1 text-xs text-text-muted">
            Plan actual: <strong>{PLAN_DETAILS[currentTier].label}</strong>
            {currentCommissionRate && (
              <> — Comisión: <strong>{currentCommissionRate}%</strong></>
            )}
            {preferentialRateActive && (
              <Badge variant="success" className="ml-2">Tasa Preferencial</Badge>
            )}
          </p>
        </div>
        {(currentTier === "Intermedio" || currentTier === "Premium") && (
          <button
            onClick={handlePortal}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <CreditCard className="h-3.5 w-3.5" /> Portal de Facturación
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tierOrder.map((tier) => {
          const plan = PLAN_DETAILS[tier];
          const isCurrent = tier === currentTier;
          const Icon = PLAN_ICONS[tier];

          return (
            <div
              key={tier}
              className={`rounded-xl border p-4 flex flex-col ${
                isCurrent
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : plan.recommended
                    ? "border-primary/30"
                    : "border-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${isCurrent ? "bg-primary/15" : "bg-gray-100"}`}>
                  <Icon className={`h-4 w-4 ${isCurrent ? "text-primary" : "text-text-muted"}`} />
                </div>
                <h4 className="font-semibold text-sm text-text">{plan.label}</h4>
                {isCurrent && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
              </div>

              <p className="text-lg font-bold text-text mb-1">{plan.price}</p>
              <p className="text-xs text-text-muted mb-3">
                Comisión: <span className="font-semibold text-text">{plan.commission}</span>
                <br />
                <span className="text-[10px]">{plan.commissionNote}</span>
              </p>

              <ul className="flex-1 space-y-1 mb-4">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="text-xs text-text-muted flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span> {f}
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-xs text-text-muted pl-4">
                    +{plan.features.length - 4} más
                  </li>
                )}
              </ul>

              {isCurrent ? (
                <Badge variant="info" className="w-full justify-center">Plan Actual</Badge>
              ) : tier === "Fundador" ? (
                <p className="w-full text-center text-xs text-text-muted">
                  Asignado por SuperAdmin
                </p>
              ) : (
                <Button
                  className="w-full"
                  size="sm"
                  variant={plan.recommended ? "primary" : "outline"}
                  onClick={() => handleChangePlan(tier)}
                  loading={loading === tier}
                >
                  {tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier) ? "Mejorar" : "Cambiar"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
