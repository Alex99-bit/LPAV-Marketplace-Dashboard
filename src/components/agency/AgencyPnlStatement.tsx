import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/formatters";
import Spinner from "@/components/ui/Spinner";

interface PnLData {
  totalRevenue: number;
  platformCommissions: number;
  agencyExpenses: number;
  netProfit: number;
  marginPercent: number;
}

export default function AgencyPnlStatement() {
  const { profile } = useAuth();
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("current_month");

  useEffect(() => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    const now = new Date();
    let startDate: string;
    if (period === "current_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (period === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      startDate = endDate; // just use the full last month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    } else {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString();
    }

    Promise.all([
      supabase.from("transactions_orders")
        .select("total_amount, platform_commission_fee, agency_commission_fee")
        .eq("tenant_id", profile.tenant_id)
        .gte("created_at", startDate)
        .in("payment_status", ["paid", "partial_paid"]),
      supabase.from("fiscal_expense_records")
        .select("total, subtotal, iva_amount")
        .eq("tenant_id", profile.tenant_id)
        .gte("recorded_at", startDate),
    ]).then(([ordersRes, expensesRes]) => {
      const orders = ordersRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const platformCommissions = orders.reduce((s, o) => s + ((o.agency_commission_fee || o.platform_commission_fee) || 0), 0);
      const agencyExpenses = expenses.reduce((s, e) => s + (e.total || 0), 0);
      const netProfit = totalRevenue - platformCommissions - agencyExpenses;
      const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setData({ totalRevenue, platformCommissions, agencyExpenses, netProfit, marginPercent });
      setLoading(false);
    });
  }, [profile?.tenant_id, period]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">Estado de Resultados (P&L)</h3>
        <select
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="current_month">Mes Actual</option>
          <option value="last_month">Mes Anterior</option>
          <option value="year">Año Actual</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-emerald-100 p-1.5"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
            <span className="text-xs text-text-muted">Ingresos Brutos</span>
          </div>
          <p className="text-xl font-bold text-text">{formatCurrency(data.totalRevenue, "MXN")}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-red-100 p-1.5"><TrendingDown className="h-4 w-4 text-red-600" /></div>
            <span className="text-xs text-text-muted">Comisiones Pagadas</span>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(data.platformCommissions, "MXN")}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-amber-100 p-1.5"><TrendingDown className="h-4 w-4 text-amber-600" /></div>
            <span className="text-xs text-text-muted">Gastos Operativos</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(data.agencyExpenses, "MXN")}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`rounded-lg p-1.5 ${data.netProfit >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
              <TrendingUp className={`h-4 w-4 ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`} />
            </div>
            <span className="text-xs text-text-muted">Utilidad Neta</span>
          </div>
          <p className={`text-xl font-bold ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(data.netProfit, "MXN")}
          </p>
          <p className="text-xs text-text-muted mt-1">
            <Percent className="h-3 w-3 inline mr-0.5" />
            {Math.abs(data.marginPercent).toFixed(1)}% margen
          </p>
        </div>
      </div>
    </div>
  );
}
