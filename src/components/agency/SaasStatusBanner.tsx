import { Link } from "react-router";
import { AlertCircle, CheckCircle, Clock, CreditCard } from "lucide-react";
import type { SaasSubscription } from "@/types";

interface SaasStatusBannerProps {
  subscription: SaasSubscription | null;
  tenantStatus: string;
}

export default function SaasStatusBanner({ subscription, tenantStatus }: SaasStatusBannerProps) {
  if (tenantStatus === "Suspendido por Pago") {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800">Cuenta Suspendida</p>
            <p className="text-xs text-red-600">
              Tu suscripción no está activa. Tus flyers han sido ocultados.
            </p>
          </div>
        </div>
        <Link to="/agency/settings">
          <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors inline-flex items-center gap-1">
            <CreditCard className="h-3 w-3" /> Ir a Facturación
          </button>
        </Link>
      </div>
    );
  }

  if (subscription?.grace_period_end) {
    const graceEnd = new Date(subscription.grace_period_end);
    const daysLeft = Math.ceil((graceEnd.getTime() - Date.now()) / 86400000);
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">Período de Gracia</p>
            <p className="text-xs text-amber-600">
              Tu pago no pudo procesarse. Tienes {daysLeft} días para actualizar tu método de pago.
            </p>
          </div>
        </div>
        <Link to="/agency/settings">
          <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors inline-flex items-center gap-1">
            <CreditCard className="h-3 w-3" /> Actualizar Pago
          </button>
        </Link>
      </div>
    );
  }

  if (subscription) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Plan {subscription.plan_tier} — Activo
          </p>
          <p className="text-xs text-emerald-600">
            {subscription.billing_cycle === "monthly" ? "Mensual" : "Anual"}
            {subscription.current_period_end &&
              ` · Renueva el ${new Date(subscription.current_period_end).toLocaleDateString("es-MX")}`}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
