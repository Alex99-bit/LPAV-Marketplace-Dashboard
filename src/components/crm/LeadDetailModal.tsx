import { useState, useEffect } from "react";
import {
  User,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Plane,
  Building,
  StickyNote,
  Hand,
} from "lucide-react";
import type { CRMLead, CRMActivity } from "@/types";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import AIQualificationProgress from "@/components/crm/AIQualificationProgress";
import { CRM_LEAD_STATUS, CRM_LEAD_STATUS_OPTIONS } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

interface LeadDetailModalProps {
  open: boolean;
  onClose: () => void;
  lead: (CRMLead & {
    profiles?: { full_name: string | null } | null;
    travel_packages?: { title: string; region: string; price: number; currency: string } | null;
  }) | null;
  onLeadUpdated: () => void;
}

export default function LeadDetailModal({
  open,
  onClose,
  lead,
  onLeadUpdated,
}: LeadDetailModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!lead || !open) return;
    (async () => {
      setLoadingActivities(true);
      const { data } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("lead_id", lead.lead_id)
        .order("created_at", { ascending: false })
        .limit(50);
      setActivities(data ?? []);
      setLoadingActivities(false);
    })();
  }, [lead, open]);

  if (!lead) return null;

  const statusInfo = CRM_LEAD_STATUS[lead.status];
  const travelerName = (lead.profiles as { full_name: string | null } | null)?.full_name ?? "Viajero";
  const pkg = lead.travel_packages as { title: string; region: string; price: number; currency: string } | null;

  const handleStatusChange = async (newStatus: string) => {
    if (!user) return;

    // Confirm critical status changes
    if (newStatus === "won" || newStatus === "lost") {
      const action = newStatus === "won" ? "marcar como ganado" : "marcar como perdido";
      const confirmed = window.confirm(`¿Estás seguro de que deseas ${action} este lead? Esta acción es importante para tus métricas.`);
      if (!confirmed) {
        onLeadUpdated(); // Reset the select to current status
        return;
      }
    }

    setUpdatingStatus(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      console.error("No auth token available");
      setUpdatingStatus(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-lead-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lead_id: lead.lead_id, status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Failed to update status:", error);
        addToast("error", "Error al actualizar estado", error.error);
      } else {
        addToast("success", "Estado actualizado", `Lead cambiado a ${CRM_LEAD_STATUS[newStatus as keyof typeof CRM_LEAD_STATUS]?.label ?? newStatus}`);
      }
    } catch (err) {
      console.error("Status update error:", err);
    }

    setUpdatingStatus(false);
    onLeadUpdated();
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setSavingNote(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      console.error("No auth token available");
      setSavingNote(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-lead-activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lead_id: lead.lead_id, description: newNote.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Failed to add note:", error);
        addToast("error", "Error al agregar nota");
      } else {
        addToast("success", "Nota agregada");
      }
    } catch (err) {
      console.error("Add note error:", err);
    }

    setNewNote("");
    setSavingNote(false);
    const { data } = await supabase
      .from("crm_activities")
      .select("*")
      .eq("lead_id", lead.lead_id)
      .order("created_at", { ascending: false })
      .limit(50);
    setActivities(data ?? []);
  };

  const handleTakeControl = async () => {
    if (!user || !lead.conversation_id) return;
    setTransferring(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      console.error("No auth token available");
      setTransferring(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transfer-lead-to-human`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lead_id: lead.lead_id, conversation_id: lead.conversation_id }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Failed to transfer lead:", error);
        addToast("error", "Error al transferir lead");
      } else {
        addToast("success", "Control tomado", "Ahora puedes continuar la conversación manualmente.");
      }
    } catch (err) {
      console.error("Transfer error:", err);
    }

    setTransferring(false);
    onLeadUpdated();
  };

  const progress = lead.ai_qualification_progress ?? {};

  return (
    <Modal open={open} onClose={onClose} title="Detalle del Lead" size="xl">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <Select
            options={CRM_LEAD_STATUS_OPTIONS}
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            className="w-44"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text">Viajero</h3>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <User className="h-4 w-4" />
              <span>{travelerName}</span>
            </div>
          </div>

          {pkg && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">Paquete</h3>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Package className="h-4 w-4" />
                <span className="truncate">{pkg.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <MapPin className="h-4 w-4" />
                <span>{pkg.region}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <DollarSign className="h-4 w-4" />
                <span>{formatCurrency(pkg.price, pkg.currency as "MXN" | "USD" | "EUR")}</span>
              </div>
            </div>
          )}
        </div>

        {lead.estimated_budget > 0 && (
          <div className="rounded-xl bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Presupuesto estimado</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(lead.estimated_budget, lead.budget_currency)}
              </span>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {Boolean(progress.number_of_travelers) && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Users className="h-4 w-4" />
              <span>{String(progress.number_of_travelers)} viajeros</span>
            </div>
          )}
          {Boolean(progress.preferred_travel_dates) && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Calendar className="h-4 w-4" />
              <span>{String(progress.preferred_travel_dates)}</span>
            </div>
          )}
          {Boolean(progress.travel_type) && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Plane className="h-4 w-4" />
              <span>{String(progress.travel_type)}</span>
            </div>
          )}
          {Boolean(progress.accommodation_type) && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Building className="h-4 w-4" />
              <span>{String(progress.accommodation_type)}</span>
            </div>
          )}
          {Boolean(progress.traveler_origin) && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <MapPin className="h-4 w-4" />
              <span>Origen: {String(progress.traveler_origin)}</span>
            </div>
          )}
          {Boolean(progress.preferred_airline) && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Plane className="h-4 w-4" />
              <span>Aerolinea: {String(progress.preferred_airline)}</span>
            </div>
          )}
        </div>

        {lead.special_requirements && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">{lead.special_requirements}</p>
          </div>
        )}

        <AIQualificationProgress fieldsExtracted={progress} />

        {lead.conversation_id && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTakeControl}
            disabled={transferring}
            loading={transferring}
          >
            <Hand className="h-4 w-4" />
            Tomar control del chat
          </Button>
        )}

        <div className="border-t border-gray-100 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-text">Actividad</h3>
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="Agregar nota..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddNote();
              }}
            />
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || savingNote}
              loading={savingNote}
            >
              <StickyNote className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {loadingActivities ? (
              <p className="text-center text-sm text-text-muted">Cargando...</p>
            ) : activities.length === 0 ? (
              <p className="text-center text-sm text-text-muted">Sin actividad</p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.activity_id}
                  className="rounded-lg bg-surface p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text">
                      {activity.activity_type === "note" && "Nota"}
                      {activity.activity_type === "status_change" && "Cambio de estado"}
                      {activity.activity_type === "assignment" && "Asignacion"}
                      {activity.activity_type === "created" && "Lead creado"}
                      {activity.activity_type === "ai_extraction" && "Extraccion IA"}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="mt-1 text-xs text-text-muted">{activity.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3 text-center text-[10px] text-text-muted">
          Creado: {formatDateTime(lead.created_at)}
        </div>
      </div>
    </Modal>
  );
}
