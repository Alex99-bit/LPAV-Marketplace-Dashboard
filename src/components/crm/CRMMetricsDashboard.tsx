import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Users, Clock, Target, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/formatters";

interface CRMMetrics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  totalBudget: number;
  wonBudget: number;
  leadsBySource: { source: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  leadsByMonth: { month: string; count: number }[];
}

interface CRMMetricsDashboardProps {
  embedded?: boolean;
}

export default function CRMMetricsDashboard({ embedded = false }: CRMMetricsDashboardProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CRMMetrics>({
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    totalBudget: 0,
    wonBudget: 0,
    leadsBySource: [],
    leadsByStatus: [],
    leadsByMonth: [],
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;

    (async () => {
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("status, source, estimated_budget, created_at")
        .eq("tenant_id", profile.tenant_id!);

      if (!leads) {
        setLoading(false);
        return;
      }

      const totalLeads = leads.length;
      const newLeads = leads.filter((l) => l.status === "new").length;
      const qualifiedLeads = leads.filter((l) => l.status === "qualified").length;
      const wonLeads = leads.filter((l) => l.status === "won").length;
      const lostLeads = leads.filter((l) => l.status === "lost").length;
      const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

      const totalBudget = leads.reduce((sum, l) => sum + Number(l.estimated_budget || 0), 0);
      const wonBudget = leads
        .filter((l) => l.status === "won")
        .reduce((sum, l) => sum + Number(l.estimated_budget || 0), 0);

      const sourceMap = new Map<string, number>();
      for (const lead of leads) {
        sourceMap.set(lead.source, (sourceMap.get(lead.source) ?? 0) + 1);
      }

      const statusMap = new Map<string, number>();
      for (const lead of leads) {
        statusMap.set(lead.status, (statusMap.get(lead.status) ?? 0) + 1);
      }

      const monthMap = new Map<string, number>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("es-MX", { month: "short" });
        monthMap.set(key, 0);
      }
      for (const lead of leads) {
        const d = new Date(lead.created_at);
        const key = d.toLocaleDateString("es-MX", { month: "short" });
        if (monthMap.has(key)) {
          monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
        }
      }

      setMetrics({
        totalLeads,
        newLeads,
        qualifiedLeads,
        wonLeads,
        lostLeads,
        conversionRate,
        avgResponseTime: 0,
        totalBudget,
        wonBudget,
        leadsBySource: Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count })),
        leadsByStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
        leadsByMonth: Array.from(monthMap.entries()).map(([month, count]) => ({ month, count })),
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

  const maxMonthCount = Math.max(...metrics.leadsByMonth.map((m) => m.count), 1);

  const statusLabels: Record<string, string> = {
    new: "Nuevo",
    contacted: "Contactado",
    qualified: "Cualificado",
    proposal_sent: "Propuesta",
    won: "Ganado",
    lost: "Perdido",
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-400",
    contacted: "bg-amber-400",
    qualified: "bg-emerald-400",
    proposal_sent: "bg-purple-400",
    won: "bg-green-500",
    lost: "bg-red-400",
  };

  return (
    <div className={embedded ? "" : "mx-auto max-w-6xl px-4 py-8 sm:px-6"}>
      {!embedded && (
        <div className="mb-6 flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-text">Métricas CRM</h1>
            <p className="text-xs text-text-muted">Análisis de rendimiento de ventas</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <Users className="h-5 w-5 text-blue-500" />
          <p className="mt-2 text-2xl font-bold text-text">{metrics.totalLeads}</p>
          <p className="text-xs text-text-muted">Total Leads</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <Target className="h-5 w-5 text-emerald-500" />
          <p className="mt-2 text-2xl font-bold text-text">{metrics.conversionRate}%</p>
          <p className="text-xs text-text-muted">Conversión</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-text">{metrics.wonLeads}</p>
          <p className="text-xs text-text-muted">Ganados</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <Clock className="h-5 w-5 text-amber-500" />
          <p className="mt-2 text-2xl font-bold text-text">{metrics.newLeads}</p>
          <p className="text-xs text-text-muted">Nuevos</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <p className="mt-2 text-2xl font-bold text-text">{formatCurrency(metrics.totalBudget)}</p>
          <p className="text-xs text-text-muted">Pipeline Total</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <DollarSign className="h-5 w-5 text-green-600" />
          <p className="mt-2 text-2xl font-bold text-text">{formatCurrency(metrics.wonBudget)}</p>
          <p className="text-xs text-text-muted">Ingreso Ganado</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h3 className="text-sm font-semibold text-text mb-4">Leads por Mes</h3>
          <div className="flex items-end gap-2 h-40">
            {metrics.leadsByMonth.map((item) => {
              const height = (item.count / maxMonthCount) * 100;
              return (
                <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary to-blue-400 transition-all hover:from-primary-dark hover:to-blue-500"
                      style={{ height: `${height}%` }}
                      title={`${item.count} leads`}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h3 className="text-sm font-semibold text-text mb-4">Distribución por Estado</h3>
          <div className="space-y-3">
            {metrics.leadsByStatus.map((item) => {
              const pct = metrics.totalLeads > 0 ? Math.round((item.count / metrics.totalLeads) * 100) : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text-muted">{statusLabels[item.status] ?? item.status}</span>
                    <span className="font-medium text-text">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${statusColors[item.status] ?? "bg-gray-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-sm font-semibold text-text mb-4">Leads por Fuente</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.leadsBySource.map((item) => (
            <div key={item.source} className="rounded-xl bg-surface p-4 text-center">
              <p className="text-2xl font-bold text-text">{item.count}</p>
              <p className="text-xs text-text-muted capitalize mt-1">{item.source}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
