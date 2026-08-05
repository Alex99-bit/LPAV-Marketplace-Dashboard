import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ExternalSale, TravelPackage } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import { CURRENCIES } from "@/lib/constants";

export default function ExternalSalesPanel() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [sales, setSales] = useState<(ExternalSale & { travel_packages?: { title: string } | null })[]>([]);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    package_id: "",
    rooms_sold: "1",
    total_amount: "",
    currency: "MXN",
    notes: "",
  });

  const fetchData = async () => {
    if (!profile?.tenant_id) return;

    const [salesRes, pkgsRes] = await Promise.all([
      supabase
        .from("external_sales_log")
        .select("*, travel_packages(title)")
        .eq("tenant_id", profile.tenant_id)
        .order("sale_date", { ascending: false }),
      supabase
        .from("travel_packages")
        .select("package_id, title, total_rooms, available_rooms")
        .eq("tenant_id", profile.tenant_id)
        .order("title"),
    ]);

    setSales((salesRes.data ?? []) as (ExternalSale & { travel_packages?: { title: string } | null })[]);
    setPackages(pkgsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile?.tenant_id]);

  const handleRegisterSale = async () => {
    if (!profile?.tenant_id) return;
    setSaving(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      addToast("error", "Error de sesión");
      setSaving(false);
      return;
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-inventory?action=external_sale`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: form.package_id || null,
          rooms_sold: Number(form.rooms_sold),
          total_amount: form.total_amount ? Number(form.total_amount) : null,
          currency: form.currency,
          notes: form.notes || null,
        }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      addToast("error", "Error al registrar venta", json.error);
    } else {
      setShowForm(false);
      setForm({ package_id: "", rooms_sold: "1", total_amount: "", currency: "MXN", notes: "" });
      addToast("success", "Venta externa registrada", "El inventario se ha actualizado");
      await fetchData();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Ventas Externas (Conciliación)</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Registra ventas realizadas fuera de la plataforma para mantener el inventario actualizado
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Registrar Venta
        </Button>
      </div>

      {sales.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          No hay ventas externas registradas. Registra aquí las ventas que realices fuera de Avimo.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-50">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-50 bg-surface">
              <tr>
                <th className="px-4 py-2 font-medium text-text-muted">Paquete</th>
                <th className="px-4 py-2 font-medium text-text-muted">Habitaciones</th>
                <th className="px-4 py-2 font-medium text-text-muted">Monto</th>
                <th className="px-4 py-2 font-medium text-text-muted">Fecha</th>
                <th className="px-4 py-2 font-medium text-text-muted">Notas</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.sale_id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 text-text">
                    {sale.travel_packages?.title || "Venta sin paquete"}
                  </td>
                  <td className="px-4 py-2 text-text">{sale.rooms_sold}</td>
                  <td className="px-4 py-2 text-text">
                    {sale.total_amount
                      ? formatCurrency(sale.total_amount, sale.currency as "MXN" | "USD" | "EUR")
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-text-muted">{formatDate(sale.sale_date)}</td>
                  <td className="px-4 py-2 text-text-muted max-w-[200px] truncate">
                    {sale.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Registrar Venta Externa"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Paquete (opcional)"
            options={[
              { value: "", label: "Sin paquete asociado" },
              ...packages.map((p) => ({
                value: p.package_id,
                label: `${p.title} (${p.available_rooms > 0 ? `${p.available_rooms} disp.` : "Agotado"})`,
              })),
            ]}
            value={form.package_id}
            onChange={(e) => setForm({ ...form, package_id: e.target.value })}
            placeholder="Selecciona un paquete"
          />
          <Input
            label="Habitaciones vendidas"
            type="number"
            min="1"
            value={form.rooms_sold}
            onChange={(e) => setForm({ ...form, rooms_sold: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto total (opcional)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.total_amount}
              onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
            />
            <Select
              label="Divisa"
              options={CURRENCIES}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="ext-sale-notes">
              Notas (opcional)
            </label>
            <textarea
              id="ext-sale-notes"
              placeholder="Ej: Venta directa en oficina, contacto telefónico..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-text transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-y"
            />
          </div>
          <Button
            className="w-full"
            loading={saving}
            onClick={handleRegisterSale}
            disabled={!form.rooms_sold || Number(form.rooms_sold) < 1}
          >
            <Plus className="h-4 w-4" /> Registrar Venta
          </Button>
        </div>
      </Modal>
    </div>
  );
}
