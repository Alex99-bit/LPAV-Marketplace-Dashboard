import { formatCurrency } from "@/lib/formatters";

interface ProfitabilityRow {
  package_id: string;
  title: string;
  gross_revenue: number;
  platform_fee: number;
  net_profit: number;
  currency: string;
}

interface ProfitabilityTableProps {
  data: ProfitabilityRow[];
}

export default function ProfitabilityTable({ data }: ProfitabilityTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-semibold text-text">Rentabilidad por Viaje</h3>
        <p className="mt-4 text-sm text-text-muted text-center py-8">
          Aún no hay datos de rentabilidad.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Rentabilidad por Viaje</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="pb-3 font-medium text-text-muted">Paquete</th>
              <th className="pb-3 font-medium text-text-muted text-right">Bruto</th>
              <th className="pb-3 font-medium text-text-muted text-right">Comisión</th>
              <th className="pb-3 font-medium text-text-muted text-right">Neto</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.package_id} className="border-b border-gray-50 last:border-0">
                <td className="py-3 font-medium text-text">{row.title}</td>
                <td className="py-3 text-right text-text">
                  {formatCurrency(row.gross_revenue, row.currency as "MXN" | "USD" | "EUR")}
                </td>
                <td className="py-3 text-right text-red-600">
                  -{formatCurrency(row.platform_fee, row.currency as "MXN" | "USD" | "EUR")}
                </td>
                <td className="py-3 text-right font-medium text-emerald-600">
                  {formatCurrency(row.net_profit, row.currency as "MXN" | "USD" | "EUR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
