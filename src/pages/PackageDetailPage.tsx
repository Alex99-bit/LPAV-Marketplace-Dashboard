import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, ShoppingCart, Sparkles, MapPin, Calendar, Building2, MessageCircle } from "lucide-react";
import type { TravelPackage, ItineraryData } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PUBLICATION_STATES } from "@/lib/constants";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import ItineraryDisplay from "@/components/marketplace/ItineraryDisplay";

export default function PackageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, items } = useCart();
  const { user } = useAuth();

  const [pkg, setPkg] = useState<TravelPackage | null>(null);
  const [agencyName, setAgencyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itineraryError, setItineraryError] = useState("");
  const [showItinerary, setShowItinerary] = useState(false);
  const [requestingInfo, setRequestingInfo] = useState(false);

  const isInCart = items.some((i) => i.package_id === id);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("travel_packages")
        .select("*, agencies_tenants(business_name)")
        .eq("package_id", id)
        .single();
      if (data) {
        setPkg(data);
        setAgencyName(
          (data.agencies_tenants as unknown as { business_name: string })
            ?.business_name ?? "",
        );
      }
      setLoading(false);
    })();
  }, [id]);

  const handleGenerateItinerary = async () => {
    if (!user) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (!id) return;

    setItineraryLoading(true);
    setItineraryError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No session");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-itinerary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ package_id: id }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error generando itinerario");

      setItinerary(json as ItineraryData);
      setShowItinerary(true);
    } catch (err) {
      setItineraryError(
        err instanceof Error ? err.message : "Error desconocido",
      );
    } finally {
      setItineraryLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!user) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (!id) return;

    setRequestingInfo(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No session");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-lead`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ package_id: id }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error creando solicitud");

      navigate("/chat", { state: { conversationId: json.conversation_id, leadId: json.lead_id } });
    } catch (err) {
      setItineraryError(
        err instanceof Error ? err.message : "Error desconocido",
      );
    } finally {
      setRequestingInfo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <span className="text-5xl">😕</span>
        <p className="text-text-muted">Paquete no encontrado</p>
        <Link to="/">
          <Button variant="outline">Volver al catálogo</Button>
        </Link>
      </div>
    );
  }

  const statusInfo = PUBLICATION_STATES[pkg.publication_status];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-gray-100">
          <div className="aspect-[3/4]">
            <img
              src={pkg.url_flyer_storage}
              alt={pkg.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant={pkg.publication_status === "published" ? "info" : "warning"}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold text-text">{pkg.title}</h1>
            {agencyName && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-text-muted">
                <Building2 className="h-4 w-4" />
                {agencyName}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
              <MapPin className="h-4 w-4" />
              {pkg.region}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
              <Calendar className="h-4 w-4" />
              {formatDate(pkg.departure_date)}
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-muted">Precio desde</span>
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(pkg.price, pkg.currency)}
              </span>
            </div>
            <p className="mt-1 text-right text-xs text-text-muted">
              por persona
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              disabled={isInCart || pkg.publication_status !== "published"}
              onClick={() => addItem(pkg)}
            >
              <ShoppingCart className="h-5 w-5" />
              {isInCart
                ? "Ya está en tu carrito"
                : pkg.publication_status !== "published"
                  ? "No disponible"
                  : "Agregar al carrito"}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              loading={itineraryLoading}
              onClick={handleGenerateItinerary}
            >
              <Sparkles className="h-5 w-5" />
              Generar Itinerario con IA ✨
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              loading={requestingInfo}
              onClick={handleRequestInfo}
              disabled={pkg.publication_status !== "published"}
            >
              <MessageCircle className="h-5 w-5" />
              Solicitar informacion
            </Button>
            {itineraryError && (
              <p className="text-sm text-red-500">{itineraryError}</p>
            )}
          </div>

          {pkg.has_coordinator && (
            <Badge variant="success" className="w-fit">
              ✓ Incluye coordinador de viaje
            </Badge>
          )}
        </div>
      </div>

      <Modal
        open={showItinerary}
        onClose={() => setShowItinerary(false)}
        title="Itinerario generado por IA"
        size="lg"
      >
        {itinerary && <ItineraryDisplay itinerary={itinerary} />}
      </Modal>
    </div>
  );
}
