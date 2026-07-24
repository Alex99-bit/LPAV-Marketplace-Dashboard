import { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/formatters";
import type { FiscalExpenseRecord } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "infrastructure", label: "Infraestructura" },
  { value: "ai_api", label: "API de IA" },
  { value: "salaries", label: "Nómina" },
  { value: "rent", label: "Renta" },
  { value: "software", label: "Software" },
  { value: "marketing", label: "Marketing" },
  { value: "legal_accounting", label: "Legal/Contable" },
  { value: "stripe_fees", label: "Fees de Stripe" },
  { value: "other", label: "Otro" },
];

const emptyForm = {
  concept: "",
  expense_category: "infrastructure" as string,
  provider_name: "",
  provider_rfc: "",
  subtotal: 0,
  iva_amount: 0,
  total: 0,
  cfdi_uuid: "",
  notes: "",
};

export default function FiscalExpenseTab() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [records, setRecords] = useState<FiscalExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    supabase
      .from("fiscal_expense_records")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setRecords((data as FiscalExpenseRecord[]) ?? []);
        setLoading(false);
      });
  }, []);

  const handleSubtotalChange = (value: number) => {
    const iva = Math.round(value * 0.16 * 100) / 100;
    setForm({ ...form, subtotal: value, iva_amount: iva, total: Math.round((value + iva) * 100) / 100 });
  };

  const handleSave = async () => {
    if (!form.concept || form.subtotal <= 0) {
      addToast("error", "Faltan datos", "Concepto y subtotal son obligatorios.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("fiscal_expense_records").insert({
      concept: form.concept,
      expense_category: form.expense_category,
      provider_name: form.provider_name || null,
      provider_rfc: form.provider_rfc || null,
      subtotal: form.subtotal,
      iva_amount: form.iva_amount,
      total: form.total,
      cfdi_uuid: form.cfdi_uuid || null,
      notes: form.notes || null,
      recorded_by: user?.id,
      recorded_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      addToast("error", "Error al registrar", error.message);
      return;
    }
    addToast("success", "Egreso registrado", "El gasto se guardó correctamente.");
    setForm(emptyForm);
    setShowForm(false);
    supabase
      .from("fiscal_expense_records")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setRecords((data as FiscalExpenseRecord[]) ?? []));
  };

  const kpi = {
    expenseSubtotal: records.reduce((s, r) => s + r.subtotal, 0),
    expenseIVA: records.reduce((s, r) => s + r.iva_amount, 0),
    expenseTotal: records.reduce((s, r) => s + r.total, 0),
  };

  const catSums: Record<string, number> = {};
  records.forEach((r) => {
    catSums[r.expense_category] = (catSums[r.expense_category] ?? 0) + r.subtotal;
  });

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-text-muted">Egresos (subtotal)</p>
          <p className="text-lg font-bold text-text">{formatCurrency(kpi.expenseSubtotal)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-text-muted">IVA Acreditable</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(kpi.expenseIVA)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-text-muted">Total Egresos</p>
          <p className="text-lg font-bold text-red-500">{formatCurrency(kpi.expenseTotal)}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-text-muted">{records.length} registros</span>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Nuevo Egreso
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-text mb-4">Registrar Egreso</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Concepto" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} placeholder="Ej. Servidor Supabase Pro - Julio 2026" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Categoría</label>
              <select value={form.expense_category} onChange={(e) => setForm({ ...form, expense_category: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <Input label="Proveedor" value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} placeholder="Nombre del proveedor" />
            <Input label="RFC Proveedor" value={form.provider_rfc} onChange={(e) => setForm({ ...form, provider_rfc: e.target.value })} placeholder="RFC para deducción" />
            <Input label="CFDI UUID" value={form.cfdi_uuid} onChange={(e) => setForm({ ...form, cfdi_uuid: e.target.value })} placeholder="UUID de la factura" />
            <div className="col-span-2 grid grid-cols-3 gap-4">
              <Input label="Subtotal (sin IVA)" type="number" value={form.subtotal || ""} onChange={(e) => handleSubtotalChange(parseFloat(e.target.value) || 0)} />
              <Input label="IVA (16%)" type="number" value={form.iva_amount || ""} onChange={(e) => setForm({ ...form, iva_amount: parseFloat(e.target.value) || 0, total: form.subtotal + (parseFloat(e.target.value) || 0) })} />
              <Input label="Total" type="number" value={form.total || ""} disabled />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-text">Notas</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" rows={2} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4" /> Registrar</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {Object.entries(catSums).sort((a, b) => b[1] - a[1]).map(([cat, sum]) => {
          const label = CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
          const max = Math.max(...Object.values(catSums));
          const pct = max > 0 ? (sum / max) * 100 : 0;
          return (
            <div key={cat} className="rounded-lg border border-gray-100 bg-white p-3">
              <p className="text-xs text-text-muted truncate">{label}</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-sm font-medium text-text">{formatCurrency(sum)}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-surface text-left">
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Fecha</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Concepto</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Categoría</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-right">Subtotal</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-right">IVA</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-right">Total</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted text-center">CFDI</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.expense_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-text-muted text-xs">
                  {new Date(r.recorded_at).toLocaleDateString("es-MX")}
                </td>
                <td className="px-4 py-2.5 text-text font-medium max-w-[200px] truncate">{r.concept}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="default">{CATEGORIES.find((c) => c.value === r.expense_category)?.label ?? r.expense_category}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-text">{formatCurrency(r.subtotal)}</td>
                <td className="px-4 py-2.5 text-right text-green-600">{formatCurrency(r.iva_amount)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-red-500">{formatCurrency(r.total)}</td>
                <td className="px-4 py-2.5 text-center">
                  {r.cfdi_uuid ? (
                    <span className="text-xs text-success">Recibido</span>
                  ) : (
                    <span className="text-xs text-text-muted">Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted text-sm">
                  Sin egresos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
