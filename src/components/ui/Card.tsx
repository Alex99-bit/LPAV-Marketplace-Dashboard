import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className = "", padding = true }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface-raised ${
        padding ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* StatCard — migración de components/agency/KpiCard a primitivo genérico.
   TODO(F1-statcard): reemplazar todos los usos de KpiCard por StatCard y
   eliminar el archivo duplicado en agency/. */
interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  trend?: string;
  className?: string;
}

export function StatCard({ icon, label, value, trend, className = "" }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface-raised p-4 transition-shadow hover:shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-text-muted">{label}</p>
          <p className="mt-0.5 text-lg font-bold text-text">{value}</p>
          {trend && (
            <p className="mt-0.5 text-xs text-success">{trend}</p>
          )}
        </div>
      </div>
    </div>
  );
}
