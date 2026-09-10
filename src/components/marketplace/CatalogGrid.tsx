import type { TravelPackage } from "@/types";
import FlyerCard from "./FlyerCard";

interface CatalogGridProps {
  packages: TravelPackage[];
  loading?: boolean;
}

export default function CatalogGrid({ packages, loading }: CatalogGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="text-5xl">🏖️</span>
        <h3 className="text-lg font-semibold text-text">
          No se encontraron paquetes
        </h3>
        <p className="text-sm text-text-muted">
          Intenta ajustar los filtros o explora otras regiones.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {packages.map((pkg) => {
        const agency = (pkg as unknown as { agencies_tenants?: { business_name?: string; tenant_id?: string } }).agencies_tenants;
        return (
          <FlyerCard
            key={pkg.package_id}
            pkg={pkg}
            agencyName={agency?.business_name}
            agencyTenantId={agency?.tenant_id}
          />
        );
      })}
    </div>
  );
}
