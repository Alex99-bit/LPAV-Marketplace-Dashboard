import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw } from "lucide-react";
import type { CRMLead } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import LeadCard from "@/components/crm/LeadCard";
import LeadDetailModal from "@/components/crm/LeadDetailModal";
import LeadFilters from "@/components/crm/LeadFilters";

export default function AgencyCRM() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = useCallback(async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role_name")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("crm_leads")
      .select("*, profiles!crm_leads_traveler_user_id_fkey(full_name), travel_packages(title, region)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }
    if (priorityFilter) {
      query = query.eq("priority", priorityFilter);
    }

    const { data: profile2 } = await supabase
      .from("profiles")
      .select("can_view_global_leads")
      .eq("id", user.id)
      .maybeSingle();

    const canViewAll =
      profile2 &&
      "can_view_global_leads" in profile2 &&
      (profile2 as Record<string, unknown>).can_view_global_leads === true;

    if (!canViewAll && profile.role_name !== "Agency_Admin") {
      query = query.eq("assigned_to", user.id);
    }

    const { data } = await query.limit(100);
    setLeads(data ?? []);
    setLoading(false);
  }, [user, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("crm-leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_leads" },
        () => {
          fetchLeads();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLeads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-text">CRM</h1>
            <p className="text-xs text-text-muted">
              Gestiona tus leads y seguimiento de ventas
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mb-4">
        <LeadFilters
          status={statusFilter}
          priority={priorityFilter}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
        />
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-3 h-12 w-12 text-text-muted/30" />
          <p className="text-sm text-text-muted">No hay leads aun</p>
          <p className="mt-1 text-xs text-text-muted">
            Los leads se crean automaticamente cuando un viajero solicita informacion de un paquete.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead.lead_id}
              lead={lead}
              onClick={() => setSelectedLead(lead)}
            />
          ))}
        </div>
      )}

      <LeadDetailModal
        open={selectedLead !== null}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        onLeadUpdated={() => {
          fetchLeads();
          if (selectedLead) {
            const updated = leads.find((l) => l.lead_id === selectedLead.lead_id);
            if (updated) setSelectedLead(updated);
          }
        }}
      />
    </div>
  );
}
