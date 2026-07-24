import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/formatters";
import type { FiscalPeriod, FiscalIncomeRecord } from "@/types";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

export default function FiscalPeriodTab() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState<string | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fiscal_periods")
      .select("*")
      .order("period_start", { ascending: false })
      .limit(36);
    setPeriods((data as FiscalPeriod[]) ?? []);
    setLoading(false);
  };

  const handleClosePeriod = async (periodId: string) => {
    setClosing(periodId);
    const { error } = await supabase.rpc("close_fiscal_period", { p_period_id: periodId });
    setClosing(null);
    if (error) {
      addToast("error", "Error al cerrar periodo", error.message);
      return;
    }
    addToast("success", "Periodo cerrado", "Los totales han sido calculados y guardados.");
    loadPeriods();
  };

  const generatePeriods = async () => {
    const now = new Date();
    const months: { label: string; start: string; end: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      months.push({
        label: start.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
        start: start.toISOString().split("T")[0]!,
        end: end.toISOString().split("T")[0]!,
      });
    }
    for (const m of months) {
      await supabase.from("fiscal_periods").insert({
        period_type: "monthly",
        period_label: m.label.charAt(0).toUpperCase() + m.label.slice(1),
        period_start: m.start,
        period_end: m.end,
        status: "open",
      }).select().maybeSingle();
    }
    addToast("success", "Periodos generados", "Se crearon periodos para los últimos 12 meses.");
    loadPeriods();
  };

  const exportCSV = () => {
    const headers = "Fecha,Concepto,Tipo,Subtotal,IVA,Total,CFDI\n";
    supabase
      .from("fiscal_income_records")
      .select("*")
      .order("recorded_at")
      .then(({ data }) => {
        const rows = (data as FiscalIncomeRecord[]).map((r) =>
          [
            r.recorded_at.split("T")[0],
            `"${r.concept}"`,
            r.income_type,
            r.subtotal,
            r.iva_amount,
            r.total,
            r.cfdi_uuid ?? "",
          ].join(",")
        ).join("\n");
        const blob = new Blob([headers + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ingresos_fiscales_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={generatePeriods}>
          Generar Periodos (12 meses)
        </Button>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {periods.map((p) => (
          <div key={p.period_id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text capitalize">{p.period_label}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                p.status === "open" ? "bg-blue-50 text-blue-600" :
                p.status === "closed" ? "bg-amber-50 text-amber-600" :
                "bg-green-50 text-green-600"
              }`}>
                {p.status === "open" ? "Abierto" : p.status === "closed" ? "Cerrado" : "Declarado"}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Ingresos (subtotal)</span>
                <span className="text-text">{formatCurrency(p.total_income_subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">IVA Cobrado</span>
                <span className="text-amber-600">{formatCurrency(p.total_income_iva)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Egresos (subtotal)</span>
                <span className="text-text">{formatCurrency(p.total_expense_subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">IVA Pagado</span>
                <span className="text-green-600">{formatCurrency(p.total_expense_iva)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-text">IVA a Declarar</span>
                  <span className={p.iva_to_declare >= 0 ? "text-amber-600" : "text-green-600"}>
                    {formatCurrency(p.iva_to_declare)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold mt-1">
                  <span className="text-text">Base ISR</span>
                  <span className="text-primary">{formatCurrency(p.isr_base)}</span>
                </div>
              </div>
            </div>
            {p.status === "open" && (
              <Button
                className="mt-4 w-full"
                size="sm"
                variant="outline"
                onClick={() => handleClosePeriod(p.period_id)}
                loading={closing === p.period_id}
              >
                Cerrar Periodo
              </Button>
            )}
            {p.status !== "open" && (
              <p className="mt-4 text-xs text-text-muted text-center">
                Cerrado el {new Date(p.closed_at!).toLocaleDateString("es-MX")}
              </p>
            )}
          </div>
        ))}
        {periods.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-muted">
            <p>No hay periodos fiscales.</p>
            <p className="text-sm mt-1">Usa "Generar Periodos" para crear los periodos mensuales.</p>
          </div>
        )}
      </div>
    </div>
  );
}
