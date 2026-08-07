import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router";
import { ShoppingCart, Sparkles, MapPin, Calendar, Building2, MessageCircle, ArrowLeft, Plane } from "lucide-react";
import type { TravelPackage, ItineraryData } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PUBLICATION_STATES } from "@/lib/constants";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import ItineraryDisplay from "@/components/marketplace/ItineraryDisplay";
import ReviewList from "@/components/marketplace/ReviewList";
import ReviewForm from "@/components/marketplace/ReviewForm";

export default function PackageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem, items } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [pkg, setPkg] = useState<TravelPackage | null>(null);
  const [agencyName, setAgencyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itineraryError, setItineraryError] = useState("");
  const [showItinerary, setShowItinerary] = useState(false);
  const [requestingInfo, setRequestingInfo] = useState(false);
  const [requestInfoError, setRequestInfoError] = useState("");

  const isInCart = items.some((i) => i.package_id === id);
  const isSoldOut = pkg && pkg.total_rooms > 0 && pkg.available_rooms <= 0;

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
      addToast("success", "Itinerario generado", "Revisa el plan día por día para este paquete.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setItineraryError(msg);
      addToast("error", "No se pudo generar el itinerario", msg);
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
    setRequestInfoError("");
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

      addToast("success", "Solicitud enviada", "La agencia recibirá tu mensaje y te responderá pronto.");
      navigate("/chat", { state: { conversationId: json.conversation_id, leadId: json.lead_id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setRequestInfoError(msg);
      addToast("error", "No se pudo enviar la solicitud", msg);
    } finally {
      setRequestingInfo(false);
    }
  };

  const handleAddToCart = () => {
    if (!pkg) return;
    addItem(pkg);
    addToast("success", "Agregado al carrito", `"${pkg.title}" está listo para reservar.`);
    // TODO(F3-carrito-undo): añadir acción "Ir al carrito" dentro del toast
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
          <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Volver al catálogo</Button>
        </Link>
      </div>
    );
  }

  const statusInfo = PUBLICATION_STATES[pkg.publication_status];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-text-muted">
        <Link to="/" className="hover:text-primary transition-colors">
          Paquetes
        </Link>
        <span>/</span>
        <span className="text-text truncate max-w-[300px]">{pkg.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-gray-100">
          <div className="aspect-[3/4]">
            <img
              src={pkg.url_flyer_storage}
              alt={pkg.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                // TODO(F3-pkg-image-fallback): usar imagen placeholder
                // del sistema en vez de ocultar el elemento.
                (e.target as HTMLImageElement).style.display = "none";
              }}
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
            {pkg.departure_city && (
              <div className="flex items-center gap-1.5 text-sm text-text-muted">
                <Plane className="h-4 w-4" />
                Sale desde {pkg.departure_city}
              </div>
            )}
          </div>

          {pkg.description && (
            <p className="text-sm text-text-muted leading-relaxed">
              {pkg.description}
            </p>
          )}

          {pkg.total_rooms > 0 && (
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-sm text-text-muted">
                {pkg.available_rooms > 0
                  ? `${pkg.available_rooms} de ${pkg.total_rooms} habitaciones disponibles`
                  : "Agotado"}
              </p>
            </div>
          )}

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
              disabled={isInCart || pkg.publication_status !== "published" || isSoldOut}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5" />
              {isInCart
                ? "Ya está en tu carrito"
                : isSoldOut
                  ? "Agotado"
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
              Generar Itinerario con IA
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              loading={requestingInfo}
              onClick={handleRequestInfo}
              disabled={pkg.publication_status !== "published" || isSoldOut}
            >
              <MessageCircle className="h-5 w-5" />
              Solicitar información
            </Button>
            {itineraryError && (
              <p className="text-sm text-red-500">{itineraryError}</p>
            )}
            {requestInfoError && (
              <p className="text-sm text-red-500">{requestInfoError}</p>
            )}
          </div>

          {pkg.has_coordinator && (
            <Badge variant="success" className="w-fit">
              ✓ Incluye coordinador de viaje
            </Badge>
          )}

          {/* TODO(F3-reviews-gate): gatear ReviewForm por orden pagada del
              usuario sobre este paquete. Por ahora se muestra siempre para
              viajeros autenticados. */}
          {user && (
            <ReviewForm
              packageId={pkg.package_id}
              orderId=""
              onSubmit={() => {}}
            />
          )}
        </div>
      </div>

      <div className="mt-8">
        <ReviewList packageId={pkg.package_id} />
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
