import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  Building2, ShieldCheck, MapPin, Mail, Phone, Globe,
  ArrowLeft, Star, Package, Calendar, ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PLAN_DETAILS } from "@/lib/constants";
import type { TravelPackage } from "@/types";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";

interface AgencyProfile {
  tenant_id: string;
  business_name: string;
  logo_url?: string;
  description?: string;
  plan_type?: string;
  verification_status?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  years_of_service?: number;
  has_physical_location?: boolean;
  status?: string;
  address_text?: string;
}

interface AgencyReview {
  review_id: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  profiles?: { full_name: string };
}

export default function AgencyPublicProfilePage() {
  const { tenantId } = useParams();
  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [reviews, setReviews] = useState<AgencyReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"packages" | "reviews">("packages");

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      // 1. Fetch agency profile
      const { data: agData } = await supabase
        .from("agencies_tenants")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (agData) {
        setAgency(agData as unknown as AgencyProfile);
      }

      // 2. Fetch published packages
      const { data: pkgs } = await supabase
        .from("travel_packages")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("publication_status", ["published", "concluded"])
        .order("created_at", { ascending: false });

      setPackages((pkgs as unknown as TravelPackage[]) ?? []);

      // 3. Fetch reviews for this agency's packages
      const packageIds = (pkgs ?? []).map((p) => p.package_id);
      if (packageIds.length > 0) {
        const { data: revs } = await supabase
          .from("package_reviews")
          .select("*, profiles(full_name)")
          .in("package_id", packageIds)
          .eq("status", "published")
          .order("created_at", { ascending: false });

        const reviewData = (revs ?? []) as unknown as AgencyReview[];
        setReviews(reviewData);

        if (reviewData.length > 0) {
          const sum = reviewData.reduce((acc, r) => acc + r.rating, 0);
          setAvgRating(Math.round((sum / reviewData.length) * 10) / 10);
          setTotalReviews(reviewData.length);
        }
      }

      setLoading(false);
    })();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <span className="text-5xl">😕</span>
        <p className="text-text-muted">Agencia no encontrada</p>
        <Link to="/">
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <ArrowLeft className="mr-1 inline h-4 w-4" /> Volver al catálogo
          </button>
        </Link>
      </div>
    );
  }

  const planInfo = agency.plan_type ? PLAN_DETAILS[agency.plan_type as keyof typeof PLAN_DETAILS] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Cover */}
      <div className="relative bg-gradient-to-r from-primary/90 to-primary">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al catálogo
          </Link>

          <div className="flex items-start gap-6">
            {/* Logo */}
            {agency.logo_url ? (
              <img
                src={agency.logo_url}
                alt={agency.business_name}
                className="h-20 w-20 rounded-2xl object-cover shadow-lg ring-4 ring-white/20"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 shadow-lg ring-4 ring-white/20">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">
                {agency.business_name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {agency.verification_status === "verified" && (
                  <Badge variant="success" className="bg-white/20 text-white border-white/30">
                    <ShieldCheck className="mr-1 inline h-3 w-3" /> Verificada
                  </Badge>
                )}
                {planInfo && (
                  <Badge variant="info" className="bg-white/20 text-white border-white/30">
                    Plan {agency.plan_type}
                  </Badge>
                )}
                {agency.years_of_service && agency.years_of_service > 0 && (
                  <span className="text-sm text-white/80">
                    {agency.years_of_service} {agency.years_of_service === 1 ? "año" : "años"} de servicio
                  </span>
                )}
                {agency.has_physical_location && (
                  <span className="text-sm text-white/80">
                    📍 Con local físico
                  </span>
                )}
              </div>

              {/* Rating */}
              {totalReviews > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-white/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {avgRating}
                  </span>
                  <span className="text-sm text-white/70">
                    ({totalReviews} reseña{totalReviews !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {agency.description && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text">Sobre nosotros</h2>
                <p className="mt-3 text-sm text-text-muted leading-relaxed">
                  {agency.description}
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setActiveTab("packages")}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === "packages"
                      ? "border-b-2 border-primary text-primary"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Package className="mr-1.5 inline h-4 w-4" />
                  Paquetes ({packages.length})
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === "reviews"
                      ? "border-b-2 border-primary text-primary"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Star className="mr-1.5 inline h-4 w-4" />
                  Reseñas ({totalReviews})
                </button>
              </div>

              <div className="p-6">
                {activeTab === "packages" && (
                  <>
                    {packages.length === 0 ? (
                      <div className="py-12 text-center">
                        <Package className="mx-auto h-12 w-12 text-text-muted/30" />
                        <p className="mt-3 text-sm text-text-muted">
                          Esta agencia aún no tiene paquetes publicados.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {packages.map((pkg) => (
                          <Link
                            key={pkg.package_id}
                            to={`/package/${pkg.package_id}`}
                            className="group overflow-hidden rounded-xl border border-gray-100 bg-surface transition-all hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                src={pkg.url_thumbnail_storage || pkg.url_flyer_storage}
                                alt={pkg.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <div className="p-3">
                              <h3 className="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">
                                {pkg.title}
                              </h3>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-xs text-text-muted">
                                  {pkg.region}
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  {formatCurrency(pkg.price, pkg.currency)}
                                </span>
                              </div>
                              {pkg.departure_date && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(pkg.departure_date)}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "reviews" && (
                  <>
                    {reviews.length === 0 ? (
                      <div className="py-12 text-center">
                        <Star className="mx-auto h-12 w-12 text-text-muted/30" />
                        <p className="mt-3 text-sm text-text-muted">
                          Esta agencia aún no tiene reseñas.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div
                            key={review.review_id}
                            className="rounded-xl border border-gray-100 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3.5 w-3.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-medium text-text">
                                  {review.title}
                                </span>
                              </div>
                              <span className="text-xs text-text-muted">
                                {new Date(review.created_at).toLocaleDateString("es-MX")}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="mt-2 text-sm text-text-muted">
                                {review.comment}
                              </p>
                            )}
                            {review.profiles?.full_name && (
                              <p className="mt-2 text-xs text-text-muted">
                                — {review.profiles.full_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-text">Contacto</h3>
              <div className="mt-3 space-y-3">
                {agency.contact_email && (
                  <a
                    href={`mailto:${agency.contact_email}`}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {agency.contact_email}
                  </a>
                )}
                {agency.contact_phone && (
                  <a
                    href={`tel:${agency.contact_phone}`}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    {agency.contact_phone}
                  </a>
                )}
                {agency.website_url && (
                  <a
                    href={agency.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    {agency.website_url.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {agency.address_text && (
                  <div className="flex items-start gap-2 text-sm text-text-muted">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {agency.address_text}
                  </div>
                )}
              </div>
            </div>

            {/* Stats card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-text">Información</h3>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Paquetes activos</span>
                  <span className="font-medium text-text">
                    {packages.filter((p) => p.publication_status === "published").length}
                  </span>
                </div>
                {totalReviews > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Calificación</span>
                    <span className="font-medium text-text">
                      ⭐ {avgRating} ({totalReviews})
                    </span>
                  </div>
                )}
                {agency.plan_type && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Plan</span>
                    <span className="font-medium text-text">{agency.plan_type}</span>
                  </div>
                )}
                {agency.years_of_service != null && agency.years_of_service > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Experiencia</span>
                    <span className="font-medium text-text">
                      {agency.years_of_service} {agency.years_of_service === 1 ? "año" : "años"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
