import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Users, RefreshCw, Search, BarChart3 } from "lucide-react";
import type { CRMLead } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import LeadCard from "@/components/crm/LeadCard";
import LeadDetailModal from "@/components/crm/LeadDetailModal";
import LeadFilters from "@/components/crm/LeadFilters";
import CRMMetricsDashboard from "@/components/crm/CRMMetricsDashboard";

export default function AgencyCRM() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id, role_name")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        console.error("Failed to fetch profile:", profileError);
        setLoading(false);
        return;
      }

      const { data: rolePerms } = await supabase
        .from("custom_roles_permissions")
        .select("can_view_global_leads")
        .eq("tenant_id", profile.tenant_id)
        .eq("role_name", profile.role_name)
        .maybeSingle();

      const canViewAll = rolePerms?.can_view_global_leads === true || profile.role_name === "Agency_Admin";

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

      if (!canViewAll) {
        query = query.eq("assigned_to", user.id);
      }

      const { data, error: leadsError } = await query.limit(100);

      if (leadsError) {
        console.error("Failed to fetch leads:", leadsError);
      }

      setLeads(data ?? []);
    } catch (err) {
      console.error("Fetch leads error:", err);
    } finally {
      setLoading(false);
    }
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
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fetchLeads();
          }, 500);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, fetchLeads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter((lead) => {
      const travelerName = ((lead as unknown as { profiles?: { full_name?: string } }).profiles?.full_name ?? "").toLowerCase();
      const pkgTitle = ((lead as unknown as { travel_packages?: { title?: string } }).travel_packages?.title ?? "").toLowerCase();
      const pkgRegion = ((lead as unknown as { travel_packages?: { region?: string } }).travel_packages?.region ?? "").toLowerCase();
      return travelerName.includes(q) || pkgTitle.includes(q) || pkgRegion.includes(q);
    });
  }, [leads, searchQuery]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-text">CRM</h1>
              <p className="text-xs text-text-muted">Gestiona tus leads y seguimiento de ventas</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-32 rounded bg-gray-100" />
                </div>
                <div className="h-5 w-16 rounded-full bg-gray-200" />
              </div>
              <div className="mt-4 h-2 w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMetrics(!showMetrics)}>
            <BarChart3 className="h-4 w-4" />
            {showMetrics ? "Ocultar Métricas" : "Métricas"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {showMetrics && (
        <div className="mb-6">
          <CRMMetricsDashboard embedded />
        </div>
      )}

      <div className="mb-4 space-y-3">
        <LeadFilters
          status={statusFilter}
          priority={priorityFilter}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por viajero, paquete o región..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-3 h-12 w-12 text-text-muted/30" />
          <p className="text-sm text-text-muted">
            {searchQuery ? "No se encontraron resultados" : "No hay leads aun"}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {searchQuery
              ? "Intenta con otro término de búsqueda."
              : "Los leads se crean automaticamente cuando un viajero solicita informacion de un paquete."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => (
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
