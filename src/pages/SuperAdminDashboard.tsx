import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PackageReport, AgencyTenant } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<PackageReport[]>([]);
  const [agencies, setAgencies] = useState<AgencyTenant[]>([]);
  const [metrics, setMetrics] = useState({
    totalAgencies: 0,
    totalPackages: 0,
    totalRevenue: 0,
    commissionEarned: 0,
  });

  const fetchData = async () => {
    const [reportsRes, agenciesRes, packagesRes, ordersRes] = await Promise.all([
      supabase.from("package_reports").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("agencies_tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("travel_packages").select("package_id", { count: "exact", head: true }),
      supabase.from("transactions_orders").select("total_amount, platform_commission_fee"),
    ]);

    setReports(reportsRes.data ?? []);
    setAgencies((agenciesRes.data ?? []) as AgencyTenant[]);

    const orders = ordersRes.data ?? [];
    setMetrics({
      totalAgencies: agenciesRes.data?.length ?? 0,
      totalPackages: packagesRes.count ?? 0,
      totalRevenue: orders.reduce((sum, o) => sum + o.total_amount, 0),
      commissionEarned: orders.reduce((sum, o) => sum + o.platform_commission_fee, 0),
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReview = async (reportId: string, decision: "approve" | "ban") => {
    await supabase.functions.invoke("review-package", {
      body: { report_id: reportId, decision },
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-text">SuperAdmin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-text">{metrics.totalAgencies}</p>
          <p className="text-sm text-text-muted">Agencias</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-text">{metrics.totalPackages}</p>
          <p className="text-sm text-text-muted">Paquetes</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-text">${metrics.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-text-muted">Ingresos Totales</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-text">${metrics.commissionEarned.toLocaleString()}</p>
          <p className="text-sm text-text-muted">Comisión Ganada</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-text mb-4">Cola de Moderación</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No hay reportes pendientes.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.report_id} className="flex items-center justify-between rounded-xl border border-gray-50 p-4">
                <div>
                  <p className="text-sm font-medium text-text">Paquete: {report.package_id.slice(0, 8)}</p>
                  <p className="text-xs text-text-muted">{report.reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReview(report.report_id, "approve")}>
                    Aprobar
                  </Button>
                  <Button size="sm" onClick={() => handleReview(report.report_id, "ban")}>
                    Banear
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-text mb-4">Agencias</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="pb-3 font-medium text-text-muted">Nombre</th>
                <th className="pb-3 font-medium text-text-muted">Estado</th>
                <th className="pb-3 font-medium text-text-muted">Plan</th>
                <th className="pb-3 font-medium text-text-muted">RFC</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency) => (
                <tr key={agency.tenant_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 font-medium text-text">{agency.business_name}</td>
                  <td className="py-3">
                    <Badge variant={agency.status === "Activo" ? "success" : "warning"}>
                      {agency.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-text-muted">{agency.subscription_tier}</td>
                  <td className="py-3 text-text-muted font-mono text-xs">{agency.rfc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
