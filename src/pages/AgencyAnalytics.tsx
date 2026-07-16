import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";

interface AnalyticsData {
  funnel: { views: number; leads: number; qualified: number; won: number };
  avgResponseTime: number;
  leadSources: { source: string; count: number }[];
  revenueByPackage: { title: string; revenue: number }[];
}

export default function AgencyAnalytics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    funnel: { views: 0, leads: 0, qualified: 0, won: 0 },
    avgResponseTime: 0,
    leadSources: [],
    revenueByPackage: [],
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;

    (async () => {
      const tenantId = profile.tenant_id!;

      const [leadsRes, ordersRes] = await Promise.all([
        supabase.from("crm_leads").select("status, source").eq("tenant_id", tenantId),
        supabase
          .from("transactions_orders")
          .select("total_amount, travel_packages(title)")
          .eq("tenant_id", tenantId),
      ]);

      const leads = leadsRes.data ?? [];
      const qualified = leads.filter((l) => ["qualified", "proposal_sent", "won"].includes(l.status)).length;
      const won = leads.filter((l) => l.status === "won").length;

      const sourceMap = new Map<string, number>();
      for (const lead of leads) {
        sourceMap.set(lead.source, (sourceMap.get(lead.source) ?? 0) + 1);
      }

      const pkgRevenue = new Map<string, { title: string; revenue: number }>();
      for (const order of ordersRes.data ?? []) {
        const pkg = order.travel_packages as unknown as { title: string } | null;
        if (!pkg) continue;
        const existing = pkgRevenue.get(pkg.title) ?? { title: pkg.title, revenue: 0 };
        existing.revenue += order.total_amount;
        pkgRevenue.set(pkg.title, existing);
      }

      setData({
        funnel: { views: 0, leads: leads.length, qualified, won },
        avgResponseTime: 0,
        leadSources: Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count })),
        revenueByPackage: Array.from(pkgRevenue.values()).sort((a, b) => b.revenue - a.revenue),
      });
      setLoading(false);
    })();
  }, [profile?.tenant_id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const funnelSteps = [
    { label: "Vistas", value: data.funnel.views },
    { label: "Leads", value: data.funnel.leads },
    { label: "Cualificados", value: data.funnel.qualified },
    { label: "Ganados", value: data.funnel.won },
  ];

  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-text">Analíticas</h1>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
        <h3 className="text-lg font-semibold text-text mb-4">Funnel de Conversión</h3>
        <div className="space-y-3">
          {funnelSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-4">
              <span className="w-24 text-sm text-text-muted">{step.label}</span>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-lg flex items-center px-3"
                  style={{ width: `${(step.value / maxFunnel) * 100}%` }}
                >
                  <span className="text-xs font-medium text-white">{step.value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h3 className="text-lg font-semibold text-text mb-4">Fuentes de Leads</h3>
          {data.leadSources.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {data.leadSources.map((source) => (
                <div key={source.source} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-text capitalize">{source.source}</span>
                  <span className="text-sm font-medium text-text">{source.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h3 className="text-lg font-semibold text-text mb-4">Ingresos por Paquete</h3>
          {data.revenueByPackage.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {data.revenueByPackage.slice(0, 5).map((pkg) => (
                <div key={pkg.title} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-text truncate">{pkg.title}</span>
                  <span className="text-sm font-medium text-emerald-600">${pkg.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
