import { useState, useEffect } from "react";
import { Download, FileText, Stamp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { FiscalIncomeRecord } from "@/types";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function AgencyFiscalIncome() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<FiscalIncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stampingId, setStampingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    supabase
      .from("fiscal_income_records")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("recorded_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setRecords(data ?? []); setLoading(false); });
  }, [profile?.tenant_id]);

  const handleStamp = async (incomeId: string) => {
    setStampingId(incomeId);
    await supabase.functions.invoke("generate-cfdi", {
      body: {
        income_id: incomeId,
        tenant_id: profile!.tenant_id!,
      } as Record<string, unknown>,
    });
    const { data: refreshed } = await supabase
      .from("fiscal_income_records")
      .select("*")
      .eq("tenant_id", profile!.tenant_id)
      .order("recorded_at", { ascending: false })
      .limit(200);
    setRecords(refreshed ?? []);
    setStampingId(null);
  };

  const handleExportCSV = () => {
    const header = "Fecha,Concepto,Tipo,Subtotal,IVA,Total,Estatus CFDI,UUID\n";
    const rows = records.map((r) =>
      [
        r.recorded_at,
        `"${r.concept}"`,
        r.income_type === "agency_commission" ? "Comisión" : r.income_type,
        r.subtotal,
        r.iva_amount,
        r.total,
        r.cfdi_status,
        r.cfdi_uuid || "",
      ].join(","),
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingresos-fiscales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">Ingresos Fiscales</h3>
        <Button size="sm" variant="outline" onClick={handleExportCSV}>
          <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Fecha</th>
              <th className="px-4 py-3 font-medium text-text-muted">Concepto</th>
              <th className="px-4 py-3 font-medium text-text-muted">Subtotal</th>
              <th className="px-4 py-3 font-medium text-text-muted">IVA</th>
              <th className="px-4 py-3 font-medium text-text-muted">Total</th>
              <th className="px-4 py-3 font-medium text-text-muted">CFDI</th>
              <th className="px-4 py-3 font-medium text-text-muted">Acción</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  No hay ingresos fiscales registrados.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.income_id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {formatDate(r.recorded_at)}
                  </td>
                  <td className="px-4 py-3 text-text truncate max-w-[200px]">{r.concept}</td>
                  <td className="px-4 py-3 text-text">{formatCurrency(r.subtotal, "MXN")}</td>
                  <td className="px-4 py-3 text-text">{formatCurrency(r.iva_amount, "MXN")}</td>
                  <td className="px-4 py-3 text-text font-medium">{formatCurrency(r.total, "MXN")}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.cfdi_status === "issued" ? "success" : "warning"}>
                      {r.cfdi_status === "issued" ? "Emitido" : "Pendiente"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {r.cfdi_status === "issued" && r.cfdi_pdf_url ? (
                      <div className="flex gap-1">
                        <a href={r.cfdi_pdf_url!} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline"><FileText className="h-3 w-3 mr-1" /> PDF</Button>
                        </a>
                        {r.cfdi_xml_url && (
                          <a href={r.cfdi_xml_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">XML</Button>
                          </a>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleStamp(r.income_id)}
                        loading={stampingId === r.income_id}
                      >
                        <Stamp className="h-3 w-3 mr-1" /> Timbrar CFDI
                      </Button>
                    )}
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
