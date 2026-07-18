import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Package, TrendingUp, AlertCircle, MessageSquare, Users,
  DollarSign, CreditCard, Star, UserCheck, Calendar,
  Clock, FileWarning, BarChart3, ShieldAlert,
  Image, Settings, ArrowRight, CreditCard as StripeIcon,
  CheckCircle, XCircle, HelpCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/formatters";
import { PLAN_LIMITS } from "@/lib/constants";
import type { SaasSubscription, SubscriptionTier, StripeAccount } from "@/types";
import KpiCard from "@/components/agency/KpiCard";
import RevenueChart from "@/components/agency/RevenueChart";
import RecentActivity from "@/components/agency/RecentActivity";
import SaasStatusBanner from "@/components/agency/SaasStatusBanner";

interface DashboardData {
  monthlyRevenue: number;
  leadConversionRate: number;
  activeFlyers: number;
  activeChats: number;
  totalLeadsMonth: number;
  newLeadsWeek: number;
  avgResponseTime: number;
  pendingReports: number;
  overdueInstallments: number;
  totalOrdersMonth: number;
  paidRevenue: number;
  pendingRevenue: number;
  avgRating: number;
  censorshipStrikes: number;
  teamMembersCount: number;
  revenueHistory: { month: string; revenue: number }[];
}

const QUICK_ACTIONS = [
  { to: "/agency/flyers", label: "Crear Flyer", desc: "Publicar un nuevo paquete", icon: Image, color: "bg-indigo-50 text-indigo-600" },
  { to: "/agency/crm", label: "Ver Leads", desc: "Gestionar tu CRM", icon: Users, color: "bg-cyan-50 text-cyan-600" },
  { to: "/chat", label: "Chat", desc: "Mensajes con viajeros", icon: MessageSquare, color: "bg-purple-50 text-purple-600" },
  { to: "/agency/settings", label: "Configuración", desc: "Ajustes de la agencia", icon: Settings, color: "bg-gray-100 text-gray-600" },
];

const PLAN_BADGES: Record<SubscriptionTier, { label: string; color: string }> = {
  Gratuito: { label: "Plan Básico", color: "bg-gray-100 text-gray-700" },
  Comercial: { label: "Plan Comercial", color: "bg-blue-100 text-blue-700" },
  Corporativo: { label: "Plan Corporativo", color: "bg-amber-100 text-amber-700" },
};

export default function AgencyDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData>({
    monthlyRevenue: 0,
    leadConversionRate: 0,
    activeFlyers: 0,
    activeChats: 0,
    totalLeadsMonth: 0,
    newLeadsWeek: 0,
    avgResponseTime: 0,
    pendingReports: 0,
    overdueInstallments: 0,
    totalOrdersMonth: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    avgRating: 0,
    censorshipStrikes: 0,
    teamMembersCount: 0,
    revenueHistory: [],
  });
  const [subscription, setSubscription] = useState<SaasSubscription | null>(null);
  const [tenantStatus, setTenantStatus] = useState("Activo");
  const [businessName, setBusinessName] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("Gratuito");
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);

  useEffect(() => {
    if (!profile?.tenant_id) return;

    (async () => {
      const tenantId = profile.tenant_id!;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

      const [
        packagesRes,
        ordersRes,
        leadsRes,
        leadsWeekRes,
        wonLeadsRes,
        teamRes,
        subRes,
        tenantRes,
        stripeRes,
      ] = await Promise.all([
        supabase.from("travel_packages").select("package_id, publication_status").eq("tenant_id", tenantId),
        supabase.from("transactions_orders").select("total_amount, remaining_balance, payment_status, created_at").eq("tenant_id", tenantId),
        supabase.from("crm_leads").select("lead_id, created_at, status").eq("tenant_id", tenantId),
        supabase.from("crm_leads").select("lead_id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekStart),
        supabase.from("crm_leads").select("lead_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "won"),
        supabase.from("agency_team_members").select("member_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
        supabase.from("saas_subscriptions").select("*").eq("tenant_id", tenantId).single(),
        supabase.from("agencies_tenants").select("status, subscription_tier, business_name").eq("tenant_id", tenantId).single(),
        supabase.from("stripe_accounts").select("*").eq("tenant_id", tenantId).single(),
      ]);

      const packages = packagesRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const publishedCount = packages.filter((p) => p.publication_status === "published").length;

      const monthOrders = orders.filter((o) => new Date(o.created_at) >= new Date(monthStart));
      const monthlyRevenue = monthOrders.reduce((sum, o) => sum + o.total_amount, 0);
      const paidRevenue = monthOrders.filter((o) => o.payment_status === "paid").reduce((sum, o) => sum + o.total_amount, 0);
      const pendingRevenue = monthOrders.reduce((sum, o) => sum + o.remaining_balance, 0);

      const monthLeads = leads.filter((l) => new Date(l.created_at) >= new Date(monthStart));
      const totalLeads = leads.length;
      const wonCount = wonLeadsRes.count ?? 0;
      const conversionRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

      const revenueHistory: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const rev = orders
          .filter((o) => {
            const od = new Date(o.created_at);
            return od >= d && od < nextMonth;
          })
          .reduce((sum, o) => sum + o.total_amount, 0);
        revenueHistory.push({
          month: d.toLocaleDateString("es-MX", { month: "short" }),
          revenue: rev,
        });
      }

      const pkgIds = packages.map((p) => p.package_id);
      let pendingReports = 0;
      if (pkgIds.length > 0) {
        const rpRes = await supabase
          .from("package_reports")
          .select("report_id", { count: "exact", head: true })
          .eq("status", "pending")
          .in("package_id", pkgIds);
        pendingReports = rpRes.count ?? 0;
      }

      setData({
        monthlyRevenue,
        leadConversionRate: conversionRate,
        activeFlyers: publishedCount,
        activeChats: 0,
        totalLeadsMonth: monthLeads.length,
        newLeadsWeek: leadsWeekRes.count ?? 0,
        avgResponseTime: 0,
        pendingReports,
        overdueInstallments: 0,
        totalOrdersMonth: monthOrders.length,
        paidRevenue,
        pendingRevenue,
        avgRating: 0,
        censorshipStrikes: profile.censorship_strikes ?? 0,
        teamMembersCount: teamRes.count ?? 0,
        revenueHistory,
      });

      if (subRes.data) setSubscription(subRes.data as SaasSubscription);
      if (tenantRes.data) {
        setTenantStatus(tenantRes.data.status);
        setBusinessName(tenantRes.data.business_name ?? "");
        setSubscriptionTier(tenantRes.data.subscription_tier ?? "Gratuito");
      }
      if (stripeRes.data) setStripeAccount(stripeRes.data as StripeAccount);
    })();
  }, [profile?.tenant_id, profile?.censorship_strikes]);

  const planLimits = PLAN_LIMITS[subscriptionTier] ?? PLAN_LIMITS.Gratuito;
  const planBadge = PLAN_BADGES[subscriptionTier];
  const isEmpty = data.activeFlyers === 0 && data.totalOrdersMonth === 0;
  const firstName = profile?.full_name?.split(" ")[0] ?? "Agencia";

  const kpis = [
    { icon: DollarSign, label: "Ingresos del Mes", value: formatCurrency(data.monthlyRevenue), color: "bg-emerald-50 text-emerald-600" },
    { icon: TrendingUp, label: "Tasa de Conversión", value: `${data.leadConversionRate}%`, color: "bg-blue-50 text-blue-600" },
    { icon: Package, label: "Flyers Activos", value: `${data.activeFlyers}/${planLimits.maxFlyers}`, color: "bg-indigo-50 text-indigo-600" },
    { icon: MessageSquare, label: "Chats Pendientes", value: data.activeChats, color: "bg-purple-50 text-purple-600" },
    { icon: Users, label: "Leads del Mes", value: data.totalLeadsMonth, color: "bg-cyan-50 text-cyan-600" },
    { icon: UserCheck, label: "Leads esta Semana", value: data.newLeadsWeek, color: "bg-teal-50 text-teal-600" },
    { icon: Clock, label: "Tiempo Resp. Prom.", value: data.avgResponseTime > 0 ? `${data.avgResponseTime}m` : "N/A", color: "bg-orange-50 text-orange-600" },
    { icon: FileWarning, label: "Reportes Pendientes", value: data.pendingReports, color: "bg-amber-50 text-amber-600" },
    { icon: CreditCard, label: "Abonos Vencidos", value: data.overdueInstallments, color: "bg-red-50 text-red-600" },
    { icon: Calendar, label: "Órdenes del Mes", value: data.totalOrdersMonth, color: "bg-sky-50 text-sky-600" },
    { icon: DollarSign, label: "Ingreso Pagado", value: formatCurrency(data.paidRevenue), color: "bg-green-50 text-green-600" },
    { icon: AlertCircle, label: "Ingreso Pendiente", value: formatCurrency(data.pendingRevenue), color: "bg-yellow-50 text-yellow-600" },
    { icon: Star, label: "Rating Promedio", value: data.avgRating > 0 ? data.avgRating.toFixed(1) : "N/A", color: "bg-amber-50 text-amber-600" },
    { icon: ShieldAlert, label: "Strikes Censura", value: data.censorshipStrikes, color: "bg-rose-50 text-rose-600" },
    { icon: BarChart3, label: "Miembros del Equipo", value: data.teamMembersCount, color: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            ¡Hola, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {businessName && <span className="font-medium">{businessName}</span>}
            {businessName && " · "}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${planBadge.color}`}>
              {planBadge.label}
            </span>
          </p>
        </div>
      </div>

      {/* SaaS Status Banner */}
      <div className="mb-6">
        <SaasStatusBanner subscription={subscription} tenantStatus={tenantStatus} />
      </div>

      {/* Stripe Connect Status */}
      <div className="mb-6">
        <StripeConnectBanner stripeAccount={stripeAccount} />
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text">{action.label}</p>
                <p className="text-xs text-text-muted">{action.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>

      {/* Empty State */}
      {isEmpty ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Image className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-text">Bienvenido a tu Dashboard</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Empieza publicando tu primer flyer para que aparezca en el marketplace
            y empieces a recibir leads de viajeros interesados.
          </p>
          <Link
            to="/agency/flyers"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <Image className="h-4 w-4" />
            Crear mi primer flyer
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>

          {/* Charts & Activity */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <RevenueChart data={data.revenueHistory} />
            <RecentActivity />
          </div>
        </>
      )}
    </div>
  );
}

function StripeConnectBanner({ stripeAccount }: { stripeAccount: StripeAccount | null }) {
  if (!stripeAccount) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">Cuenta bancaria pendiente</p>
            <p className="text-xs text-amber-600">
              Registra tu CLABE para recibir pagos de viajeros directo a tu banco.
            </p>
          </div>
        </div>
        <Link to="/agency/settings">
          <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors">
            Registrar
          </button>
        </Link>
      </div>
    );
  }

  if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Cuenta bancaria activa</p>
          <p className="text-xs text-emerald-600">
            Los pagos de viajeros se depositan directamente en tu cuenta bancaria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <XCircle className="h-5 w-5 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-800">Cuenta bancaria en verificación</p>
          <p className="text-xs text-amber-600">
            Stripe está validando tus datos. Esto puede tomar unos minutos.
          </p>
        </div>
      </div>
      <Link to="/agency/settings">
        <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors">
          Ver estado
        </button>
      </Link>
    </div>
  );
}
