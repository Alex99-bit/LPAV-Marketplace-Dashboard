interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Ingresos Mensuales</h3>
      <div className="mt-6 flex items-end gap-2 h-48">
        {data.map((item) => {
          const height = (item.revenue / maxRevenue) * 100;
          return (
            <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all hover:from-emerald-700 hover:to-emerald-500"
                  style={{ height: `${height}%` }}
                  title={`$${item.revenue.toLocaleString()}`}
                />
              </div>
              <span className="text-xs text-text-muted">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
