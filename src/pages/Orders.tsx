import { useEffect, useState } from "react";
import { Package, Clock, CreditCard } from "lucide-react";
import type { TransactionOrder, InstallmentSchedule } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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
  const [installments, setInstallments] = useState<Map<string, InstallmentSchedule[]>>(new Map());
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

      const orderIds = (data ?? []).map((o) => o.order_id);
      if (orderIds.length > 0) {
        const { data: instData } = await supabase
          .from("installment_schedules")
          .select("*")
          .in("order_id", orderIds)
          .order("installment_number", { ascending: true });

        const map = new Map<string, InstallmentSchedule[]>();
        for (const inst of instData ?? []) {
          const existing = map.get(inst.order_id) ?? [];
          existing.push(inst);
          map.set(inst.order_id, existing);
        }
        setInstallments(map);
      }

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
            const orderInstallments = installments.get(order.order_id) ?? [];
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

                {orderInstallments.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-text mb-2">Plan de Abonos</p>
                    <div className="space-y-2">
                      {orderInstallments.map((inst) => (
                        <div
                          key={inst.installment_id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                        >
                          <div>
                            <p className="text-sm text-text">
                              Abono {inst.installment_number}
                            </p>
                            <p className="text-xs text-text-muted">
                              Vence: {formatDate(inst.due_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-text">
                              {formatCurrency(Number(inst.amount_due), order.currency)}
                            </span>
                            {inst.status === "pending" && inst.stripe_checkout_url && (
                              <a href={inst.stripe_checkout_url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline">
                                  <CreditCard className="h-3.5 w-3.5" /> Pagar
                                </Button>
                              </a>
                            )}
                            {inst.status === "paid" && (
                              <Badge variant="success">Pagado</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
