import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import type { TravelPackage } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useDebounce } from "@/hooks/useDebounce";
import Hero from "@/components/marketplace/Hero";
import CatalogGrid from "@/components/marketplace/CatalogGrid";
import PriceFilter from "@/components/marketplace/PriceFilter";
import RegionFilter from "@/components/marketplace/RegionFilter";

// TODO(F3-home-pagination): la Home carga el catálogo completo sin paginación.
// Implementar infinite scroll o páginas cuando el volumen de flyers crezca.
// TODO(F2-errores-visibles): mostrar estado de error en la UI con opción de
// reintentar en lugar de solo console.error.

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [region, setRegion] = useState(searchParams.get("region") || "");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);

  const debouncedSearch = useDebounce(search, 300);
  const debouncedPriceRange = useDebounce(priceRange, 300);

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
        onSearch={(q) => {
          setSearch(q);
          setSearchParams((prev) => {
            if (q) prev.set("q", q);
            else prev.delete("q");
            return prev;
          });
        }}
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
    </div>
  );
}
