import { useState } from "react";
import { AlertTriangle, Plus, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import type { TravelIncident } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

interface IncidentCenterProps {
  incidents: TravelIncident[];
  orders: { order_id: string; title: string }[];
  onRefresh: () => void;
}

const SEVERITY_CONFIG = {
  low: { label: "Baja", variant: "default" as const },
  medium: { label: "Media", variant: "warning" as const },
  high: { label: "Alta", variant: "danger" as const },
  critical: { label: "Crítica", variant: "danger" as const },
};

const STATUS_CONFIG = {
  open: { label: "Abierto", variant: "warning" as const },
  in_progress: { label: "En Proceso", variant: "info" as const },
  resolved: { label: "Resuelto", variant: "success" as const },
  closed: { label: "Cerrado", variant: "default" as const },
};

export default function IncidentCenter({ incidents, orders, onRefresh }: IncidentCenterProps) {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    order_id: "",
    severity: "medium",
    title: "",
    description: "",
  });

  const handleCreate = async () => {
    if (!profile?.id || !form.order_id) return;
    const { error } = await supabase.from("travel_incidents").insert({
      order_id: form.order_id,
      reported_by: profile.id,
      severity: form.severity,
      title: form.title,
      description: form.description || null,
    });
    if (error) {
      addToast("error", "No se pudo crear el incidente", error.message);
      return;
    }
    addToast("success", "Incidente reportado");
    setShowForm(false);
    setForm({ order_id: "", severity: "medium", title: "", description: "" });
    onRefresh();
  };

  const handleResolve = async (incidentId: string, resolution: string) => {
    const { error } = await supabase
      .from("travel_incidents")
      .update({ status: "resolved", resolution, resolved_at: new Date().toISOString() })
      .eq("incident_id", incidentId);
    if (error) {
      addToast("error", "Error al resolver", error.message);
    } else {
      addToast("success", "Incidente resuelto");
      onRefresh();
    }
    // TODO(F4-incidentes): permitir a la agencia escribir la resolución real en
    // un diálogo. Hoy se guarda el literal "Resuelto por agencia".
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Centro de Incidentes</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      {showForm && (
        <div className="mt-4 rounded-xl border border-gray-100 p-4 space-y-3">
          <Select
            label="Orden"
            options={orders.map((o) => ({ value: o.order_id, label: o.title }))}
            value={form.order_id}
            onChange={(e) => setForm({ ...form, order_id: e.target.value })}
            placeholder="Selecciona una orden"
          />
          <Select
            label="Severidad"
            options={[
              { value: "low", label: "Baja" },
              { value: "medium", label: "Media" },
              { value: "high", label: "Alta" },
              { value: "critical", label: "Crítica" },
            ]}
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          />
          <Input
            label="Título"
            placeholder="Describe el incidente"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Descripción"
            placeholder="Detalles adicionales..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button onClick={handleCreate} disabled={!form.title || !form.order_id}>
            Reportar Incidente
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {incidents.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No hay incidentes reportados.
          </p>
        ) : (
          incidents.map((incident) => {
            const severity = SEVERITY_CONFIG[incident.severity as keyof typeof SEVERITY_CONFIG];
            const status = STATUS_CONFIG[incident.status as keyof typeof STATUS_CONFIG];
            return (
              <div
                key={incident.incident_id}
                className="rounded-xl border border-gray-50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-text">{incident.title}</p>
                      {incident.description && (
                        <p className="mt-1 text-sm text-text-muted">{incident.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={severity?.variant}>{severity?.label}</Badge>
                    <Badge variant={status?.variant}>{status?.label}</Badge>
                  </div>
                </div>
                {incident.status === "open" && (
                  <button
                    onClick={() => handleResolve(incident.incident_id, "Resuelto por agencia")}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Marcar como resuelto
                  </button>
                )}
                {incident.resolution && (
                  <p className="mt-2 text-xs text-emerald-600">
                    Resolución: {incident.resolution}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
