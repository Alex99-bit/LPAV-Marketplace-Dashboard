import { useState, useEffect } from "react";
import { Plus, FileText } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { FiscalExpenseRecord } from "@/types";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "infrastructure", label: "Infraestructura" },
  { value: "ai_api", label: "API / IA" },
  { value: "salaries", label: "Nómina" },
  { value: "rent", label: "Renta" },
  { value: "software", label: "Software" },
  { value: "marketing", label: "Marketing" },
  { value: "legal_accounting", label: "Legal/Contable" },
  { value: "stripe_fees", label: "Comisiones Stripe" },
  { value: "other", label: "Otro" },
];

export default function AgencyExpenseTracking() {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<FiscalExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    concept: "",
    expense_category: "other",
    provider_name: "",
    provider_rfc: "",
    subtotal: "",
    iva_amount: "",
    notes: "",
  });

  const fetchExpenses = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("fiscal_expense_records")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("recorded_at", { ascending: false })
      .limit(200);
    setExpenses(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [profile?.tenant_id]);

  const handleSave = async () => {
    const subtotal = parseFloat(form.subtotal);
    if (!form.concept.trim() || isNaN(subtotal) || subtotal <= 0) return;

    setSaving(true);
    const iva = parseFloat(form.iva_amount) || subtotal * 0.16;
    await supabase.from("fiscal_expense_records").insert({
      concept: form.concept.trim(),
      expense_category: form.expense_category,
      provider_name: form.provider_name.trim() || null,
      provider_rfc: form.provider_rfc.trim().toUpperCase() || null,
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva_amount: parseFloat(iva.toFixed(2)),
      total: parseFloat((subtotal + iva).toFixed(2)),
      currency: "MXN",
      notes: form.notes.trim() || null,
      tenant_id: profile!.tenant_id!,
      created_by: profile!.id,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ concept: "", expense_category: "other", provider_name: "", provider_rfc: "", subtotal: "", iva_amount: "", notes: "" });
    fetchExpenses();
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">Gastos Operativos</h3>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Registrar Gasto
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Fecha</th>
              <th className="px-4 py-3 font-medium text-text-muted">Concepto</th>
              <th className="px-4 py-3 font-medium text-text-muted">Categoría</th>
              <th className="px-4 py-3 font-medium text-text-muted">Subtotal</th>
              <th className="px-4 py-3 font-medium text-text-muted">IVA</th>
              <th className="px-4 py-3 font-medium text-text-muted">Total</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  No hay gastos registrados.
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.expense_id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-text-muted text-xs">{formatDate(e.recorded_at)}</td>
                  <td className="px-4 py-3 text-text truncate max-w-[200px]">{e.concept}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default">
                      {CATEGORIES.find((c) => c.value === e.expense_category)?.label || e.expense_category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text">{formatCurrency(e.subtotal, "MXN")}</td>
                  <td className="px-4 py-3 text-text">{formatCurrency(e.iva_amount, "MXN")}</td>
                  <td className="px-4 py-3 text-text font-medium">{formatCurrency(e.total, "MXN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar Gasto">
        <div className="space-y-4">
          <Input
            label="Concepto"
            value={form.concept}
            onChange={(e) => setForm((p) => ({ ...p, concept: e.target.value }))}
            placeholder="Ej. Campaña de Facebook Ads"
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1">Categoría</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={form.expense_category}
              onChange={(e) => setForm((p) => ({ ...p, expense_category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subtotal (MXN)"
              type="number"
              value={form.subtotal}
              onChange={(e) => setForm((p) => ({ ...p, subtotal: e.target.value }))}
              placeholder="10000"
            />
            <Input
              label="IVA (MXN)"
              type="number"
              value={form.iva_amount}
              onChange={(e) => setForm((p) => ({ ...p, iva_amount: e.target.value }))}
              placeholder="Auto-calculado (16%)"
            />
          </div>
          <Input
            label="Proveedor"
            value={form.provider_name}
            onChange={(e) => setForm((p) => ({ ...p, provider_name: e.target.value }))}
            placeholder="Nombre del proveedor"
          />
          <Input
            label="RFC Proveedor"
            value={form.provider_rfc}
            onChange={(e) => setForm((p) => ({ ...p, provider_rfc: e.target.value }))}
            placeholder="RFC"
          />
          <Input
            label="Notas"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Detalles adicionales"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}><FileText className="h-3.5 w-3.5 mr-1" /> Registrar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
