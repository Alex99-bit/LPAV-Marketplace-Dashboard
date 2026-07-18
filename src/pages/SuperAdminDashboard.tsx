import { useEffect, useState, useCallback } from "react";
import {
  Building2, Users, Package, DollarSign, TrendingUp,
  Shield, AlertTriangle, CheckCircle, XCircle, Search,
  BarChart3, CreditCard, MessageSquare, Eye
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/formatters";
import type { PackageReport, AgencyTenant, Profile } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Input from "@/components/ui/Input";

type Tab = "resumen" | "agencias" | "usuarios" | "moderacion";

interface Metrics {
  totalAgencies: number;
  activeAgencies: number;
  totalPackages: number;
  publishedPackages: number;
  totalUsers: number;
  totalLeads: number;
  totalRevenue: number;
  commissionEarned: number;
  totalOrders: number;
  pendingReports: number;
}

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    totalAgencies: 0, activeAgencies: 0, totalPackages: 0, publishedPackages: 0,
    totalUsers: 0, totalLeads: 0, totalRevenue: 0, commissionEarned: 0,
    totalOrders: 0, pendingReports: 0,
  });
  const [agencies, setAgencies] = useState<AgencyTenant[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [reports, setReports] = useState<PackageReport[]>([]);
  const [reportPackages, setReportPackages] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [
      agenciesRes, usersRes, packagesRes, ordersRes,
      leadsRes, reportsRes, publishedRes,
    ] = await Promise.all([
      supabase.from("agencies_tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("travel_packages").select("package_id, publication_status, tenant_id"),
      supabase.from("transactions_orders").select("total_amount, platform_commission_fee, payment_status"),
      supabase.from("crm_leads").select("lead_id", { count: "exact", head: true }),
      supabase.from("package_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("travel_packages").select("package_id", { count: "exact", head: true }).eq("publication_status", "published"),
    ]);

    const allAgencies = (agenciesRes.data ?? []) as AgencyTenant[];
    const allUsers = (usersRes.data ?? []) as Profile[];
    const packages = packagesRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const allReports = reportsRes.data ?? [];

    setAgencies(allAgencies);
    setUsers(allUsers);
    setReports(allReports);

    // Build package title map for reports
    const pkgMap: Record<string, string> = {};
    for (const pkg of packages) {
      pkgMap[pkg.package_id] = pkg.publication_status;
    }
    // We need package titles for reports
    const pkgIds = allReports.map((r) => r.package_id).filter(Boolean);
    if (pkgIds.length > 0) {
      const { data: pkgDetails } = await supabase
        .from("travel_packages")
        .select("package_id, title")
        .in("package_id", pkgIds);
      if (pkgDetails) {
        for (const p of pkgDetails) {
          pkgMap[p.package_id] = p.title;
        }
      }
    }
    setReportPackages(pkgMap);

    setMetrics({
      totalAgencies: allAgencies.length,
      activeAgencies: allAgencies.filter((a) => a.status === "Activo").length,
      totalPackages: packages.length,
      publishedPackages: publishedRes.count ?? 0,
      totalUsers: allUsers.length,
      totalLeads: leadsRes.count ?? 0,
      totalRevenue: orders.reduce((sum, o) => sum + o.total_amount, 0),
      commissionEarned: orders.reduce((sum, o) => sum + o.platform_commission_fee, 0),
      totalOrders: orders.length,
      pendingReports: allReports.filter((r) => r.status === "pending").length,
    });

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReview = async (reportId: string, decision: "approve" | "ban") => {
    await supabase.functions.invoke("review-package", {
      body: { report_id: reportId, decision },
    });
    fetchData();
  };

  const handleAgencyStatus = async (tenantId: string, newStatus: string) => {
    await supabase
      .from("agencies_tenants")
      .update({ status: newStatus })
      .eq("tenant_id", tenantId);
    fetchData();
  };

  const filteredAgencies = agencies.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search && !a.business_name.toLowerCase().includes(search.toLowerCase()) &&
        !a.rfc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        (u.full_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { key: "resumen", label: "Resumen", icon: BarChart3 },
    { key: "agencias", label: "Agencias", icon: Building2 },
    { key: "usuarios", label: "Usuarios", icon: Users },
    { key: "moderacion", label: "Moderación", icon: Shield, badge: metrics.pendingReports },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white text-sm font-bold">
              L
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">Panel SuperAdmin</h1>
              <p className="text-xs text-text-muted">Solo localhost · Acceso restringido</p>
            </div>
          </div>
          <a href="/" className="text-sm text-text-muted hover:text-primary transition-colors">
            Salir
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-white p-1 border border-gray-200">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:bg-gray-50 hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    tab === t.key ? "bg-white text-primary" : "bg-red-100 text-red-600"
                  }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search bar (for agencias and usuarios tabs) */}
        {(tab === "agencias" || tab === "usuarios") && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por nombre, RFC o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        {/* Tab content */}
        {tab === "resumen" && (
          <ResumenTab metrics={metrics} />
        )}
        {tab === "agencias" && (
          <AgenciasTab
            agencies={filteredAgencies}
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
            onStatusChange={handleAgencyStatus}
          />
        )}
        {tab === "usuarios" && (
          <UsuariosTab users={filteredUsers} agencies={agencies} />
        )}
        {tab === "moderacion" && (
          <ModeracionTab reports={reports} packages={reportPackages} onReview={handleReview} />
        )}
      </div>
    </div>
  );
}

// ── Tab: Resumen ─────────────────────────────────────────────

function ResumenTab({ metrics }: { metrics: Metrics }) {
  const cards = [
    { icon: Building2, label: "Agencias Totales", value: metrics.totalAgencies, sub: `${metrics.activeAgencies} activas`, color: "bg-blue-50 text-blue-600" },
    { icon: Package, label: "Paquetes", value: metrics.totalPackages, sub: `${metrics.publishedPackages} publicados`, color: "bg-indigo-50 text-indigo-600" },
    { icon: Users, label: "Usuarios", value: metrics.totalUsers, color: "bg-purple-50 text-purple-600" },
    { icon: MessageSquare, label: "Leads CRM", value: metrics.totalLeads, color: "bg-cyan-50 text-cyan-600" },
    { icon: DollarSign, label: "Ingresos Totales", value: formatCurrency(metrics.totalRevenue), color: "bg-emerald-50 text-emerald-600" },
    { icon: CreditCard, label: "Comisión (3%)", value: formatCurrency(metrics.commissionEarned), color: "bg-green-50 text-green-600" },
    { icon: TrendingUp, label: "Órdenes", value: metrics.totalOrders, color: "bg-sky-50 text-sky-600" },
    { icon: AlertTriangle, label: "Reportes Pend.", value: metrics.pendingReports, color: metrics.pendingReports > 0 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className={`inline-flex rounded-xl p-2.5 ${card.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-text">{card.value}</p>
            <p className="text-sm text-text-muted">{card.label}</p>
            {card.sub && <p className="text-xs text-text-muted mt-0.5">{card.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Agencias ────────────────────────────────────────────

function AgenciasTab({
  agencies, statusFilter, onFilterChange, onStatusChange,
}: {
  agencies: AgencyTenant[];
  statusFilter: string;
  onFilterChange: (v: string) => void;
  onStatusChange: (tenantId: string, status: string) => void;
}) {
  const STATUS_OPTIONS = [
    { value: "all", label: "Todas" },
    { value: "Activo", label: "Activas" },
    { value: "En Revisión", label: "En Revisión" },
    { value: "Suspendido por Pago", label: "Suspendidas" },
  ];

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-primary text-white"
                : "bg-white text-text-muted border border-gray-200 hover:border-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Agencia</th>
                <th className="px-4 py-3 font-medium text-text-muted">RFC</th>
                <th className="px-4 py-3 font-medium text-text-muted">Estado</th>
                <th className="px-4 py-3 font-medium text-text-muted">Plan</th>
                <th className="px-4 py-3 font-medium text-text-muted">Creada</th>
                <th className="px-4 py-3 font-medium text-text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                    No se encontraron agencias.
                  </td>
                </tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.tenant_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-text">{agency.business_name}</td>
                    <td className="px-4 py-3 text-text-muted font-mono text-xs">{agency.rfc}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        agency.status === "Activo" ? "success" :
                        agency.status === "En Revisión" ? "warning" : "danger"
                      }>
                        {agency.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{agency.subscription_tier}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {new Date(agency.created_at).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {agency.status === "En Revisión" && (
                          <Button size="sm" onClick={() => onStatusChange(agency.tenant_id, "Activo")}>
                            Aprobar
                          </Button>
                        )}
                        {agency.status === "Activo" && (
                          <Button size="sm" variant="outline" onClick={() => onStatusChange(agency.tenant_id, "Suspendido por Pago")}>
                            Suspender
                          </Button>
                        )}
                        {agency.status === "Suspendido por Pago" && (
                          <Button size="sm" onClick={() => onStatusChange(agency.tenant_id, "Activo")}>
                            Reactivar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Usuarios ────────────────────────────────────────────

function UsuariosTab({ users, agencies }: { users: Profile[]; agencies: AgencyTenant[] }) {
  const tenantMap = new Map(agencies.map((a) => [a.tenant_id, a.business_name]));

  const roleColor = (role: string) => {
    switch (role) {
      case "SuperAdmin": return "danger";
      case "Agency_Admin": return "success";
      case "Agency_Collaborator":
      case "Agency_Agent": return "info";
      case "Agency_Pending": return "warning";
      default: return "default";
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Usuario</th>
              <th className="px-4 py-3 font-medium text-text-muted">Email</th>
              <th className="px-4 py-3 font-medium text-text-muted">Rol</th>
              <th className="px-4 py-3 font-medium text-text-muted">Agencia</th>
              <th className="px-4 py-3 font-medium text-text-muted">Registro</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-text">
                        {(user.full_name ?? "U").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-text">{user.full_name ?? "Sin nombre"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleColor(user.role_name) as "default" | "success" | "warning" | "danger" | "info"}>
                      {user.role_name}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {user.tenant_id ? tenantMap.get(user.tenant_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {new Date(user.created_at).toLocaleDateString("es-MX")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Moderación ──────────────────────────────────────────

function ModeracionTab({
  reports, packages, onReview,
}: {
  reports: PackageReport[];
  packages: Record<string, string>;
  onReview: (reportId: string, decision: "approve" | "ban") => void;
}) {
  const pending = reports.filter((r) => r.status === "pending");
  const reviewed = reports.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-text mb-4">
          Cola de Moderación
          {pending.length > 0 && (
            <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-100 px-2 text-xs font-bold text-red-600">
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-300" />
            <p className="mt-3 text-sm text-text-muted">No hay reportes pendientes. Todo limpio.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((report) => (
              <div
                key={report.report_id}
                className="flex items-start justify-between rounded-xl border border-amber-100 bg-amber-50/30 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-sm font-medium text-text">
                      {packages[report.package_id] ?? `Paquete ${report.package_id.slice(0, 8)}`}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-text-muted ml-6">{report.reason}</p>
                  <p className="mt-1 text-xs text-text-muted ml-6">
                    Reportado: {new Date(report.created_at).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReview(report.report_id, "approve")}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onReview(report.report_id, "ban")}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Banear
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Historial de Moderación</h2>
          <div className="space-y-2">
            {reviewed.map((report) => (
              <div
                key={report.report_id}
                className="flex items-center justify-between rounded-lg border border-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {report.status === "reviewed" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm text-text">
                      {packages[report.package_id] ?? `Paquete ${report.package_id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-text-muted">{report.reason}</p>
                  </div>
                </div>
                <Badge variant={report.status === "reviewed" ? "success" : "danger"}>
                  {report.status === "reviewed" ? "Aprobado" : "Desestimado"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
