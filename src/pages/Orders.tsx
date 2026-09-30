import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Clock, CreditCard, ShieldCheck, ShoppingCart, XCircle } from "lucide-react";
import type { TransactionOrder, InstallmentSchedule } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

// TODO(F3-orders-package): la tabla transactions_orders no tiene package_id.
// Una vez que el backend relacione órdenes con paquetes, hacer join a
// travel_packages para mostrar título, thumbnail y link al detalle.

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  partial_paid: { label: "Pago Parcial", variant: "info" },
  paid: { label: "Pagado", variant: "success" },
  moroso: { label: "Moroso", variant: "danger" },
  cancelled: { label: "Cancelado", variant: "danger" },
  refunded: { label: "Reembolsado", variant: "success" },
  partially_refunded: { label: "Reembolso parcial", variant: "warning" },
};

const MAX_CONFIRM_ATTEMPTS = 10;
const CONFIRM_INTERVAL_MS = 3000;

export default function Orders() {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [orders, setOrders] = useState<TransactionOrder[]>([]);
  const [installments, setInstallments] = useState<Map<string, InstallmentSchedule[]>>(new Map());
  const [loading, setLoading] = useState(true);
  // Tras volver de Stripe, el webhook puede tardar unos segundos en registrar la orden
  const [confirmingPayment, setConfirmingPayment] = useState(Boolean(sessionId));
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const cartClearedRef = useRef(false);

  const fetchOrders = useCallback(async (): Promise<TransactionOrder[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("transactions_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error cargando órdenes:", error);
      return [];
    }
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
    return data ?? [];
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // El pago en Stripe ya se completó: vaciamos el carrito de inmediato
    if (sessionId && !cartClearedRef.current) {
      cartClearedRef.current = true;
      clearCart();
    }

    const load = async (attempt: number) => {
      const data = await fetchOrders();
      if (cancelled) return;
      setLoading(false);

      if (!sessionId) return;

      const confirmed = data.some(
        (o) => o.stripe_checkout_session_id === sessionId,
      );
      if (confirmed) {
        setConfirmingPayment(false);
        setSearchParams({}, { replace: true });
        addToast("success", "¡Pago confirmado!", "Tu orden ya está disponible.");
      } else if (attempt < MAX_CONFIRM_ATTEMPTS) {
        timer = setTimeout(() => load(attempt + 1), CONFIRM_INTERVAL_MS);
      } else {
        setConfirmingPayment(false);
        setSearchParams({}, { replace: true });
        addToast(
          "warning",
          "Estamos confirmando tu pago",
          "Puede tardar unos minutos en reflejarse. Recarga esta página en un momento.",
        );
      }
    };

    load(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  const requestCancellation = async (orderId: string) => {
    if (!window.confirm("¿Quieres solicitar la cancelación de esta orden? El reembolso se calculará según la política aplicable.")) return;
    setCancellingOrderId(orderId);
    const { data, error } = await supabase.functions.invoke("cancel-order", {
      body: { order_id: orderId, reason: "traveler_request" },
    });
    setCancellingOrderId(null);
    if (error || data?.error) {
      addToast("error", "No se pudo cancelar", data?.error || "Inténtalo de nuevo o contacta a soporte.");
      return;
    }
    addToast("success", "Cancelación procesada", `Reembolso: ${formatCurrency(data.refund_amount, "MXN")}.`);
    await fetchOrders();
  };

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

      {confirmingPayment && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <Spinner size="md" />
          <div>
            <p className="flex items-center gap-1.5 font-medium text-text">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Estamos confirmando tu pago
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              Tu compra fue procesada. La orden aparecerá aquí en unos segundos.
            </p>
          </div>
        </div>
      )}

      {orders.length === 0 && !confirmingPayment ? (
        <EmptyState
          icon={ShoppingCart}
          title="Sin órdenes"
          description="Aún no has realizado ninguna compra. Explora el catálogo y encuentra tu próximo viaje."
          action={{ label: "Explorar paquetes", onClick: () => window.location.href = "/" }}
        />
      ) : orders.length === 0 ? null : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.payment_status] ?? { label: order.payment_status, variant: "default" as const };
            const orderInstallments = installments.get(order.order_id) ?? [];
            return (
              <div
                key={order.order_id}
                className="rounded-xl border border-border bg-surface-raised p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-text-muted">
                      Orden #{order.order_id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
                    </p>
                    <p className="mt-1 text-lg font-bold text-text">
                      {formatCurrency(order.total_amount, order.currency)}
                    </p>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
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

                </div>
                {order.next_payment_due && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      Próximo pago: {formatDate(order.next_payment_due)}
                    </p>
                    {/* TODO(F3-orders-cta): si payment_status === "moroso",
                        mostrar CTA "Contactar soporte" o "Regularizar pago" */}
                  </div>
                )}

                {!["cancelled", "refunded", "partially_refunded"].includes(order.payment_status) && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requestCancellation(order.order_id)}
                      loading={cancellingOrderId === order.order_id}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Solicitar cancelación
                    </Button>
                  </div>
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
