import { Link, useNavigate } from "react-router";
import type { TravelPackage } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import Badge from "@/components/ui/Badge";

interface FlyerCardProps {
  pkg: TravelPackage;
  agencyName?: string;
  agencyTenantId?: string;
}

export default function FlyerCard({ pkg, agencyName, agencyTenantId }: FlyerCardProps) {
  const navigate = useNavigate();
  const soldOut = pkg.total_rooms > 0 && pkg.available_rooms <= 0;
  const lowStock = pkg.total_rooms > 0 && pkg.available_rooms > 0 && pkg.available_rooms <= 5;

  return (
    <Link
      to={`/package/${pkg.package_id}`}
      className={`group block overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${soldOut ? "opacity-60" : ""}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        <img
          src={pkg.url_flyer_storage}
          alt={pkg.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-16">
          <h3 className="text-lg font-semibold text-white leading-tight">
            {pkg.title}
          </h3>
          {agencyName && (
            <p className="mt-0.5 text-xs text-white/80">
              {agencyTenantId ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/agency/profile/${agencyTenantId}`);
                  }}
                  className="hover:underline hover:text-white cursor-pointer"
                >
                  {agencyName}
                </button>
              ) : (
                agencyName
              )}
            </p>
          )}
          {pkg.departure_city && (
            <p className="mt-0.5 text-xs text-white/70">
              Sale desde {pkg.departure_city}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold text-white">
              {formatCurrency(pkg.price, pkg.currency)}
            </span>
            <div className="flex gap-1.5">
              {pkg.has_coordinator ? (
                <Badge variant="success">Con Coordinador</Badge>
              ) : (
                <Badge variant="default">Sin Coordinador</Badge>
              )}
            </div>
          </div>
        </div>
        {pkg.publication_status === "concluded" && (
          <div className="absolute top-3 right-3">
            <Badge variant="warning">Viaje Concluido</Badge>
          </div>
        )}
        {pkg.publication_status === "pending_review" && (
          <div className="absolute top-3 right-3">
            <Badge variant="danger">En Revisión</Badge>
          </div>
        )}
        {soldOut && (
          <div className="absolute top-3 left-3">
            <Badge variant="danger">Agotado</Badge>
          </div>
        )}
        {lowStock && !soldOut && (
          <div className="absolute top-3 left-3">
            <Badge variant="warning">¡{pkg.available_rooms} disponibles!</Badge>
          </div>
        )}
      </div>
    </Link>
  );
}
