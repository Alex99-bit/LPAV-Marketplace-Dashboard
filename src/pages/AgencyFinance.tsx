import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";
import Tabs from "@/components/ui/Tabs";
import StripeConnectStatus from "@/components/agency/StripeConnectStatus";
import RevenueOverview from "@/components/agency/RevenueOverview";
import ProfitabilityTable from "@/components/agency/ProfitabilityTable";
import CfdiInvoices from "@/components/agency/CfdiInvoices";
import ExternalSalesPanel from "@/components/agency/ExternalSalesPanel";

interface CurrencyGroup {
  totalRevenue: number;
  platformFees: number;
  netReceived: number;
}

interface FinanceData {
  stripeAccountId: string | null;
  // Totales legacy (mix de divisas — mantenido por compatibilidad con RevenueOverview)
  totalRevenue: number;
  platformFees: number;
  netReceived: number;
  // Totales agrupados por divisa
  byCurrency: Record<string, CurrencyGroup>;
  currencies: string[];
  profitability: {
    package_id: string;
    title: string;
    gross_revenue: number;
    platform_fee: number;
    net_profit: number;
    currency: string;
  }[];
}

export default function AgencyFinance() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeCurrency, setActiveCurrency] = useState("");
  const [data, setData] = useState<FinanceData>({
    stripeAccountId: null,
    totalRevenue: 0,
    platformFees: 0,
    netReceived: 0,
    byCurrency: {},
    currencies: [],
    profitability: [],
  });
  const [planInfo, setPlanInfo] = useState<{
    plan_type: string;
    commission_rate: number;
    preferential_rate_active: boolean;
  } | null>(null);

  useEffect(() => {
    if (!profile?.tenant_id) return;

    (async () => {
      const tenantId = profile.tenant_id!;

      const [tenantRes, ordersRes] = await Promise.all([
        supabase.from("agencies_tenants").select("stripe_account_id, plan_type, commission_rate, preferential_rate_active").eq("tenant_id", tenantId).single(),
        supabase
          .from("transactions_orders")
          .select("total_amount, platform_commission_fee, agency_commission_fee, currency, travel_packages(package_id, title)")
          .eq("tenant_id", tenantId),
      ]);

      const orders = ordersRes.data ?? [];

      // Agrupar ingresos por divisa (fix del bug que sumaba MXN+USD+EUR)
      const byCurrency: Record<string, CurrencyGroup> = {};
      for (const order of orders) {
        const cur = order.currency || "MXN";
        const group = byCurrency[cur] ?? { totalRevenue: 0, platformFees: 0, netReceived: 0 };
        group.totalRevenue += order.total_amount;
        group.platformFees += order.agency_commission_fee;
        group.netReceived = group.totalRevenue - group.platformFees;
        byCurrency[cur] = group;
      }
      const currencies = Object.keys(byCurrency);

      // Totales legacy (suma cruda, mantenido para RevenueOverview sin tabs)
      const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
      const platformFees = orders.reduce((sum, o) => sum + o.agency_commission_fee, 0);

      const pkgMap = new Map<string, { title: string; gross: number; fee: number; currency: string }>();
      for (const order of orders) {
        const pkg = order.travel_packages as unknown as { package_id: string; title: string } | null;
        if (!pkg) continue;
        const existing = pkgMap.get(pkg.package_id) ?? { title: pkg.title, gross: 0, fee: 0, currency: order.currency };
        existing.gross += order.total_amount;
        existing.fee += order.agency_commission_fee;
        pkgMap.set(pkg.package_id, existing);
      }

      const profitability = Array.from(pkgMap.entries()).map(([pkgId, val]) => ({
        package_id: pkgId,
        title: val.title,
        gross_revenue: val.gross,
        platform_fee: val.fee,
        net_profit: val.gross - val.fee,
        currency: val.currency,
      }));

      setData({
        stripeAccountId: tenantRes.data?.stripe_account_id ?? null,
        totalRevenue,
        platformFees,
        netReceived: totalRevenue - platformFees,
        byCurrency,
        currencies,
        profitability,
      });
      if (tenantRes.data) {
        setPlanInfo({
          plan_type: (tenantRes.data as unknown as { plan_type: string }).plan_type,
          commission_rate: (tenantRes.data as unknown as { commission_rate: number }).commission_rate,
          preferential_rate_active: (tenantRes.data as unknown as { preferential_rate_active: boolean }).preferential_rate_active,
        });
      }
      if (currencies.length > 0 && !activeCurrency) {
        setActiveCurrency(currencies[0]!);
      }
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

  const activeGroup = activeCurrency ? data.byCurrency[activeCurrency] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-text">Finanzas</h1>
      {planInfo && (
        <p className="mb-6 text-sm text-text-muted">
          Plan: <strong>{planInfo.plan_type}</strong> &middot;
          Comisión: <strong>{planInfo.commission_rate}%</strong>
          {planInfo.preferential_rate_active && (
            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Tasa Preferencial Activa
            </span>
          )}
        </p>
      )}

      <div className="space-y-6">
        <StripeConnectStatus
          stripeAccountId={data.stripeAccountId}
        />

        {data.currencies.length > 1 && (
          <Tabs
            tabs={[
              ...data.currencies.map((c) => ({ key: c, label: c })),
              { key: "all", label: "Todas" },
            ]}
            activeTab={activeCurrency || "all"}
            onChange={(key) => setActiveCurrency(key === "all" ? "" : key)}
          />
        )}

        <RevenueOverview
          totalRevenue={activeGroup?.totalRevenue ?? data.totalRevenue}
          platformFees={activeGroup?.platformFees ?? data.platformFees}
          netReceived={activeGroup?.netReceived ?? data.netReceived}
          commissionRate={planInfo?.commission_rate}
        />

        <ProfitabilityTable
          data={data.profitability.filter(
            (p) => !activeCurrency || p.currency === activeCurrency,
          )}
        />

        <CfdiInvoices tenantId={profile?.tenant_id!} />

        <ExternalSalesPanel />
      </div>
    </div>
  );
}
