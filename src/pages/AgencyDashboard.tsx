import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Package, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

interface DashboardStats {
  totalPackages: number;
  publishedPackages: number;
  pendingReports: number;
}

export default function AgencyDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPackages: 0,
    publishedPackages: 0,
    pendingReports: 0,
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;

    (async () => {
      const [packagesRes, reportsRes] = await Promise.all([
        supabase
          .from("travel_packages")
          .select("package_id, publication_status", { count: "exact" })
          .eq("tenant_id", profile.tenant_id!),
        supabase
          .from("package_reports")
          .select("report_id", { count: "exact" })
          .eq("status", "pending")
          .in(
            "package_id",
            (
              await supabase
                .from("travel_packages")
                .select("package_id")
                .eq("tenant_id", profile.tenant_id!)
            ).data?.map((p) => p.package_id) ?? [],
          ),
      ]);

      setStats({
        totalPackages: packagesRes.data?.length ?? 0,
        publishedPackages:
          packagesRes.data?.filter((p) => p.publication_status === "published")
            .length ?? 0,
        pendingReports: reportsRes.count ?? 0,
      });
    })();
  }, [profile?.tenant_id]);

  const cards = [
    {
      icon: Package,
      label: "Total de Paquetes",
      value: stats.totalPackages,
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: TrendingUp,
      label: "Publicados",
      value: stats.publishedPackages,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: AlertCircle,
      label: "Reportes Pendientes",
      value: stats.pendingReports,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="mt-1 text-sm text-text-muted">
            {profile?.full_name ?? "Agencia"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/agency/flyers">
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
              Gestionar Flyers
            </button>
          </Link>
          <Link to="/agency/roles">
            <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-text hover:bg-surface transition-colors">
              Gestionar Roles
            </button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-100 bg-white p-5"
          >
            <div className={`inline-flex rounded-xl p-2.5 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-text">{card.value}</p>
            <p className="text-sm text-text-muted">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-text">Actividad Reciente</h2>
        <p className="mt-2 text-sm text-text-muted">
          Aquí se mostrarán las notificaciones de tu agencia.
        </p>
      </div>
    </div>
  );
}
