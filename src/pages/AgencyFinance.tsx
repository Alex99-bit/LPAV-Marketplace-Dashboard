import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";
import StripeConnectStatus from "@/components/agency/StripeConnectStatus";
import RevenueOverview from "@/components/agency/RevenueOverview";
import ProfitabilityTable from "@/components/agency/ProfitabilityTable";
import CfdiInvoices from "@/components/agency/CfdiInvoices";

interface FinanceData {
  stripeAccountId: string | null;
  totalRevenue: number;
  platformFees: number;
  netReceived: number;
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
  const [data, setData] = useState<FinanceData>({
    stripeAccountId: null,
    totalRevenue: 0,
    platformFees: 0,
    netReceived: 0,
    profitability: [],
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;

    (async () => {
      const tenantId = profile.tenant_id!;

      const [tenantRes, ordersRes] = await Promise.all([
        supabase.from("agencies_tenants").select("stripe_account_id").eq("tenant_id", tenantId).single(),
        supabase
          .from("transactions_orders")
          .select("total_amount, platform_commission_fee, currency, travel_packages(package_id, title)")
          .eq("tenant_id", tenantId),
      ]);

      const orders = ordersRes.data ?? [];
      const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
      const platformFees = orders.reduce((sum, o) => sum + o.platform_commission_fee, 0);

      const pkgMap = new Map<string, { title: string; gross: number; fee: number; currency: string }>();
      for (const order of orders) {
        const pkg = order.travel_packages as unknown as { package_id: string; title: string } | null;
        if (!pkg) continue;
        const existing = pkgMap.get(pkg.package_id) ?? { title: pkg.title, gross: 0, fee: 0, currency: order.currency };
        existing.gross += order.total_amount;
        existing.fee += order.platform_commission_fee;
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
        profitability,
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-text">Finanzas</h1>

      <div className="space-y-6">
        <StripeConnectStatus
          stripeAccountId={data.stripeAccountId}
        />

        <RevenueOverview
          totalRevenue={data.totalRevenue}
          platformFees={data.platformFees}
          netReceived={data.netReceived}
        />

        <ProfitabilityTable data={data.profitability} />

        <CfdiInvoices tenantId={profile?.tenant_id!} />
      </div>
    </div>
  );
}
