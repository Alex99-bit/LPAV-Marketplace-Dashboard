import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  color: string;
}

export default function KpiCard({ icon: Icon, label, value, trend, color }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className={`inline-flex rounded-xl p-2.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-bold text-text">{value}</p>
      <p className="text-sm text-text-muted">{label}</p>
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className={trend >= 0 ? "text-emerald-600" : "text-red-600"}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
          <span className="text-text-muted">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
