import { useState, useEffect } from "react";
import { TrendingUp, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import type { AgencyTenant } from "@/types";

export default function AgencyConversionMetrics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<AgencyTenant | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [qualifiedCount, setQualifiedCount] = useState(0);
  const [threshold, setThreshold] = useState<number | null>(null);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    Promise.all([
      supabase.from("agencies_tenants")
        .select("plan_type, commission_rate, preferential_rate_active, conversion_window_leads, conversion_window_sales, conversion_rate, consecutive_months_below_threshold")
        .eq("tenant_id", profile.tenant_id)
        .single(),
      supabase.from("crm_leads")
        .select("lead_id, status", { count: "exact" })
        .eq("tenant_id", profile.tenant_id)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
    ]).then(([tenantRes, leadsRes]) => {
      setTenant(tenantRes.data as AgencyTenant | null);
      const t = tenantRes.data as AgencyTenant | null;
      const leads = leadsRes.data ?? [];
      setLeadCount(leads.length);
      setQualifiedCount(leads.filter((l) => l.status === "won").length);

      if (t?.plan_type === "Intermedio") setThreshold(5);
      else if (t?.plan_type === "Premium") setThreshold(8);
      else setThreshold(null);

      setLoading(false);
    });
  }, [profile?.tenant_id]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!tenant || !threshold) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-text mb-4">Métricas de Conversión</h3>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-text-muted">
          {tenant && !threshold
            ? `El plan ${tenant.plan_type} tiene tasa de comisión fija.`
            : "Cargando métricas..."}
        </div>
      </div>
    );
  }

  const isPreferential = tenant.preferential_rate_active;
  const leadsNeeded = threshold > 0
    ? Math.max(0, Math.ceil((qualifiedCount / leadCount || 0) < threshold / 100
        ? (leadCount * threshold / 100) - qualifiedCount
        : 0))
    : 0;
  const actualRate = leadCount > 0 ? (qualifiedCount / leadCount) * 100 : 0;

  const getTasaInfo = () => {
    if (tenant.plan_type === "Intermedio") {
      return { base: "18%", pref: "17%", diff: "−1 punto" };
    }
    return { base: "15%", pref: "12%", diff: "−3 puntos" };
  };

  const tInfo = getTasaInfo();

  return (
    <div>
      <h3 className="text-lg font-semibold text-text mb-4">Métricas de Conversión</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-blue-100 p-1.5"><Target className="h-4 w-4 text-blue-600" /></div>
            <span className="text-xs text-text-muted">Leads (3 meses)</span>
          </div>
          <p className="text-2xl font-bold text-text">{leadCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-emerald-100 p-1.5"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
            <span className="text-xs text-text-muted">Ventas (3 meses)</span>
          </div>
          <p className="text-2xl font-bold text-text">{qualifiedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-purple-100 p-1.5"><BarChart3 className="h-4 w-4 text-purple-600" /></div>
            <span className="text-xs text-text-muted">Tasa de Conversión</span>
          </div>
          <p className="text-2xl font-bold text-text">{actualRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">
              Tasa Vigente: <span className="font-bold">{isPreferential ? tInfo.pref : tInfo.base}</span>
            </p>
            <p className="text-xs text-text-muted">
              {isPreferential ? "Tasa preferencial activa" : "Tasa base"}
            </p>
          </div>
          <Badge variant={isPreferential ? "success" : "warning"}>
            {isPreferential ? "Preferencial Activa" : "Tasa Base"}
          </Badge>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-text mb-2">Progreso hacia tasa preferencial ({tInfo.pref})</p>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-primary rounded-full h-3 transition-all"
              style={{
                width: `${Math.min(100, (actualRate / threshold) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-text-muted">{actualRate.toFixed(1)}%</span>
            <span className="text-xs text-text-muted">Umbral: {threshold}%</span>
          </div>
          {leadsNeeded > 0 && (
            <p className="text-xs text-amber-600 mt-2 font-medium">
              Te faltan aproximadamente {leadsNeeded} ventas para alcanzar la tasa preferencial.
            </p>
          )}
          {actualRate >= threshold && !isPreferential && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">
              Has alcanzado el umbral. La tasa preferencial se activará en la próxima evaluación mensual.
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Tasa base ({tInfo.base})</span>
            <span className="text-text-muted">Umbral {threshold}%</span>
            <span className="text-text-muted">Tasa pref. {tInfo.pref}</span>
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>Comisión estándar</span>
            <span>{tInfo.diff} porcentual</span>
            <span>Comisión reducida</span>
          </div>
        </div>
      </div>
    </div>
  );
}
