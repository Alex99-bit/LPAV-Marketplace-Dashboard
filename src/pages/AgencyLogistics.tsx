import { useEffect, useState } from "react";
import { ListFilter, Package } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { TransactionOrder, TravelerDocument, TravelIncident } from "@/types";
import Spinner from "@/components/ui/Spinner";
import ActiveTripsList from "@/components/agency/ActiveTripsList";
import DocumentVault from "@/components/agency/DocumentVault";
import IncidentCenter from "@/components/agency/IncidentCenter";

export default function AgencyLogistics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeOrders, setActiveOrders] = useState<(TransactionOrder & { travel_packages?: { title: string; region: string; departure_date: string } | null })[]>([]);
  const [documents, setDocuments] = useState<TravelerDocument[]>([]);
  const [incidents, setIncidents] = useState<TravelIncident[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    const tenantId = profile.tenant_id!;

    const { data: orders } = await supabase
      .from("transactions_orders")
      .select("*, travel_packages(title, region, departure_date)")
      .eq("tenant_id", tenantId)
      .in("payment_status", ["paid", "partial_paid"])
      .order("created_at", { ascending: false });

    setActiveOrders((orders ?? []) as typeof activeOrders);

    const orderIds = (orders ?? []).map((o) => o.order_id);
    if (orderIds.length > 0) {
      const { data: docs } = await supabase
        .from("traveler_documents")
        .select("*")
        .in("order_id", orderIds);
      setDocuments(docs ?? []);

      const { data: incs } = await supabase
        .from("travel_incidents")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });
      setIncidents(incs ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile?.tenant_id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const orderOptions = activeOrders.map((o) => ({
    order_id: o.order_id,
    title: (o.travel_packages as { title?: string } | null)?.title ?? `Orden #${o.order_id.slice(0, 8)}`,
  }));

  const selectedDocs = selectedOrderId
    ? documents.filter((d) => d.order_id === selectedOrderId)
    : documents;

  const selectedIncidents = selectedOrderId
    ? incidents.filter((i) => i.order_id === selectedOrderId)
    : incidents;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-text">Logística</h1>

      <div className="space-y-6">
        <ActiveTripsList orders={activeOrders} />

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedOrderId(null)}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !selectedOrderId ? "bg-primary text-white" : "bg-gray-100 text-text-muted hover:bg-gray-200"
            }`}
          >
            <ListFilter className="h-3 w-3" /> Todos
          </button>
          {orderOptions.map((o) => (
            <button
              key={o.order_id}
              onClick={() => setSelectedOrderId(o.order_id)}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedOrderId === o.order_id ? "bg-primary text-white" : "bg-gray-100 text-text-muted hover:bg-gray-200"
              }`}
            >
              <Package className="h-3 w-3" /> {o.title}
            </button>
          ))}
        </div>

        <DocumentVault documents={selectedDocs} />

        <IncidentCenter incidents={selectedIncidents} orders={orderOptions} onRefresh={fetchData} />
      </div>
    </div>
  );
}
