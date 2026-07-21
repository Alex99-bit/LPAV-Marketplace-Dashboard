import { useState, useEffect, useCallback } from "react";
import type { TravelPackage } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import Hero from "@/components/marketplace/Hero";
import CatalogGrid from "@/components/marketplace/CatalogGrid";
import PriceFilter from "@/components/marketplace/PriceFilter";
import RegionFilter from "@/components/marketplace/RegionFilter";
import OnboardingModal from "@/components/marketplace/OnboardingModal";

// TODO(F3-home-pagination): la Home carga el catálogo completo sin paginación.
// Implementar infinite scroll o páginas cuando el volumen de flyers crezca.
// TODO(F2-errores-visibles): mostrar estado de error en la UI con opción de
// reintentar en lugar de solo console.error.

export default function Home() {
  const { user, isAgency } = useAuth();
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const debouncedPriceRange = useDebounce(priceRange, 300);

  // Revisa si el viajero ya completó el onboarding (PRD §4.2 — obligatorio
  // antes de habilitar itinerarios con IA).
  useEffect(() => {
    if (!user || isAgency || onboardingChecked) return;
    (async () => {
      const { data } = await supabase
        .from("user_recommendation_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      setOnboardingChecked(true);
      if (!data?.onboarding_completed) {
        setShowOnboarding(true);
      }
    })();
  }, [user, isAgency, onboardingChecked]);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("travel_packages")
      .select("*")
      .in("publication_status", ["published", "concluded"])
      .order("created_at", { ascending: false });

    if (debouncedSearch) {
      query = query.or(
        `title.ilike.%${debouncedSearch}%,region.ilike.%${debouncedSearch}%`,
      );
    }

    if (region) {
      query = query.eq("region", region);
    }

    query = query
      .gte("price", debouncedPriceRange[0])
      .lte("price", debouncedPriceRange[1]);

    const { data, error } = await query;

    if (error) {
      console.error("[Home] Error fetching packages:", error);
    }

    setPackages(data ?? []);
    setLoading(false);
  }, [debouncedSearch, region, debouncedPriceRange]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return (
    <div>
      <Hero
        searchValue={search}
        onSearchChange={setSearch}
        onInspiration={() => {
          const suggestions = [
            "Playa",
            "Aventura",
            "Cultural",
            "Romántico",
            "Europa",
          ];
          const pick = suggestions[Math.floor(Math.random() * suggestions.length)] ?? "Playa";
          setSearch(pick);
        }}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text">Paquetes disponibles</h2>
            <p className="mt-1 text-sm text-text-muted">
              {packages.length} paquete{packages.length !== 1 && "s"} encontrado
              {packages.length !== 1 && "s"}
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-48">
              <RegionFilter value={region} onChange={setRegion} />
            </div>
            <div className="w-64">
              <PriceFilter
                min={0}
                max={200000}
                value={priceRange}
                onChange={setPriceRange}
              />
            </div>
          </div>
        </div>

        <CatalogGrid packages={packages} loading={loading} />
      </section>

      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}
