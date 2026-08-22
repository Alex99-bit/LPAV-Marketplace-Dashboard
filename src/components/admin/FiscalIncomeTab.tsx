import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/formatters";
import type { FiscalIncomeRecord } from "@/types";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";

export default function FiscalIncomeTab() {
  const [records, setRecords] = useState<FiscalIncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("fiscal_income_records")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setRecords((data as FiscalIncomeRecord[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = filter === "all" ? records : records.filter((r) => r.income_type === filter);

  const kpi = {
    incomeSubtotal: records.reduce((s, r) => s + r.subtotal, 0),
    incomeIVA: records.reduce((s, r) => s + r.iva_amount, 0),
    stripeFees: records.reduce((s, r) => s + r.stripe_fee, 0),
    stripeIVA: records.reduce((s, r) => s + r.stripe_fee_iva, 0),
    netIncome: records.reduce((s, r) => s + r.total, 0) - records.reduce((s, r) => s + r.stripe_fee + r.stripe_fee_iva, 0),
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-text-muted">Ingresos Brutos</p>
          <p className="text-lg font-bold text-text">{formatCurrency(kpi.incomeSubtotal)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-text-muted">IVA Cobrado</p>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(kpi.incomeIVA)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-text-muted">Stripe Fees</p>
          <p className="text-lg font-bold text-red-500">{formatCurrency(kpi.stripeFees + kpi.stripeIVA)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-text-muted">IVA Stripe (acreditable)</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(kpi.stripeIVA)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-text-muted">Neto Real</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(kpi.netIncome)}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-text-muted">Filtrar:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
        >
          <option value="all">Todos</option>
          <option value="agency_commission">Comisión Agencia</option>
        </select>
        <span className="text-xs text-text-muted">{filtered.length} registros</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-surface text-left">
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Fecha</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Concepto</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Tipo</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-right">Subtotal</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-right">IVA</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-right">Total</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-right">Stripe</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-center">CFDI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.income_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-text-muted text-xs">
                  {new Date(r.recorded_at).toLocaleDateString("es-MX")}
                </td>
                <td className="px-4 py-2.5 text-text font-medium max-w-[200px] truncate">{r.concept}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="success">Comisión</Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-text">{formatCurrency(r.subtotal)}</td>
                <td className="px-4 py-2.5 text-right text-amber-600">{formatCurrency(r.iva_amount)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-text">{formatCurrency(r.total)}</td>
                <td className="px-4 py-2.5 text-right text-red-500 text-xs">
                  {r.stripe_fee > 0 ? formatCurrency(r.stripe_fee + r.stripe_fee_iva) : "—"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {r.cfdi_uuid ? (
                    <span className="text-xs text-success">Emitido</span>
                  ) : (
                    <span className="text-xs text-text-muted">Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted text-sm">
                  Sin registros de ingresos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
