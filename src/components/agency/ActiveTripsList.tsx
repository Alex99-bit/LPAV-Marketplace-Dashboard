import { Calendar, MapPin } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { TransactionOrder } from "@/types";

interface ActiveTripsListProps {
  orders: (TransactionOrder & { travel_packages?: { title: string; region: string; departure_date: string } | null })[];
}

export default function ActiveTripsList({ orders }: ActiveTripsListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-semibold text-text">Viajes Activos</h3>
        <p className="mt-4 text-sm text-text-muted text-center py-8">
          No hay viajes activos en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Viajes Activos</h3>
      <div className="mt-4 space-y-3">
        {orders.map((order) => {
          const pkg = order.travel_packages;
          return (
            <div
              key={order.order_id}
              className="flex items-center justify-between rounded-xl border border-gray-50 p-4"
            >
              <div>
                <p className="font-medium text-text">{pkg?.title ?? `Orden #${order.order_id.slice(0, 8)}`}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                  {pkg?.region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {pkg.region}
                    </span>
                  )}
                  {pkg?.departure_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(pkg.departure_date)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-text">
                {formatCurrency(order.total_amount, order.currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
