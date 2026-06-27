import { useEffect, useState } from "react";
import { Package, Clock } from "lucide-react";
import type { TransactionOrder } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  partial_paid: { label: "Pago Parcial", variant: "info" },
  paid: { label: "Pagado", variant: "success" },
  moroso: { label: "Moroso", variant: "danger" },
  cancelled: { label: "Cancelado", variant: "danger" },
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<TransactionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("transactions_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-text">Mis Órdenes</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package className="h-16 w-16 text-text-muted/30" />
          <h2 className="text-lg font-semibold text-text">Sin órdenes</h2>
          <p className="text-sm text-text-muted">
            Aún no has realizado ninguna compra.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.payment_status] ?? { label: order.payment_status, variant: "default" as const };
            return (
              <div
                key={order.order_id}
                className="rounded-xl border border-gray-100 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-text-muted">
                      Orden #{order.order_id.slice(0, 8)}
                    </p>
                    <p className="mt-1 font-medium text-text">
                      {formatCurrency(order.total_amount, order.currency)}
                    </p>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-text-muted">Pagado</p>
                    <p className="font-medium text-text">
                      {formatCurrency(
                        order.total_amount - order.remaining_balance,
                        order.currency,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Pendiente</p>
                    <p className="font-medium text-text">
                      {formatCurrency(order.remaining_balance, order.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Comisión</p>
                    <p className="font-medium text-text">
                      {formatCurrency(
                        order.platform_commission_fee,
                        order.currency,
                      )}
                    </p>
                  </div>
                </div>
                {order.next_payment_due && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    Próximo pago: {formatDate(order.next_payment_due)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
