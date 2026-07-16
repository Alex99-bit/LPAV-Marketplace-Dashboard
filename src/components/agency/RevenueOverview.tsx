import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface RevenueOverviewProps {
  totalRevenue: number;
  platformFees: number;
  netReceived: number;
  currency?: string;
}

export default function RevenueOverview({
  totalRevenue,
  platformFees,
  netReceived,
  currency = "MXN",
}: RevenueOverviewProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Resumen de Ingresos</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-emerald-600">Ingresos Brutos</span>
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-700">
            {formatCurrency(totalRevenue, currency as "MXN" | "USD" | "EUR")}
          </p>
        </div>
        <div className="rounded-xl bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-600">Comisión Plataforma</span>
          </div>
          <p className="mt-2 text-xl font-bold text-red-700">
            -{formatCurrency(platformFees, currency as "MXN" | "USD" | "EUR")}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-600">Neto Recibido</span>
          </div>
          <p className="mt-2 text-xl font-bold text-blue-700">
            {formatCurrency(netReceived, currency as "MXN" | "USD" | "EUR")}
          </p>
        </div>
      </div>
    </div>
  );
}
