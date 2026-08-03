import { Link } from "react-router";
import { useState, useEffect } from "react";
import { Trash2, ShoppingCart, ArrowRight, AlertTriangle, Search, Wallet } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, formatPoints } from "@/lib/formatters";
import {
  IVA_RATE,
  MIN_DEPOSIT_PERCENTAGE,
  MIN_REDEEM_POINTS,
  MAX_POINTS_PERCENT_PER_PURCHASE,
  POINTS_PER_100_MXN,
  POINT_VALUE_MXN,
} from "@/lib/constants";
import Button from "@/components/ui/Button";

export default function Checkout() {
  const { items, removeItem, total } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const hasMultipleItems = items.length > 1;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_wallets")
      .select("points_balance")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setWalletBalance(0);
          return;
        }
        setWalletBalance(data.points_balance);
      });
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShoppingCart className="h-16 w-16 text-text-muted/30" />
        <h2 className="text-xl font-semibold text-text">Tu carrito está vacío</h2>
        <p className="text-sm text-text-muted">
          Explora nuestros paquetes y añade uno a tu carrito.
        </p>
        <Link to="/">
          <Button><Search className="h-4 w-4" /> Explorar Paquetes</Button>
        </Link>
      </div>
    );
  }

  const packageSubtotal = Math.round((total / (1 + IVA_RATE)) * 100) / 100;
  const packageIVA = Math.round((total - packageSubtotal) * 100) / 100;

  const depositBase = total - pointsToRedeem * POINT_VALUE_MXN;
  const depositAmount = Math.round(depositBase * MIN_DEPOSIT_PERCENTAGE * 100) / 100;
  const totalToPay = depositAmount;
  const pointsEarned = Math.floor(total / 100) * POINTS_PER_100_MXN;
  const maxRedeemable = Math.floor(total * MAX_POINTS_PERCENT_PER_PURCHASE);
  const pointsMxnValue = pointsToRedeem * POINT_VALUE_MXN;

  const pointsValidation = (() => {
    if (walletBalance < MIN_REDEEM_POINTS) {
      return "Necesitas mínimo 200 puntos para canjear. Sigue comprando para acumular más.";
    }
    if (pointsToRedeem > walletBalance) {
      return "No tienes suficientes puntos.";
    }
    if (pointsToRedeem > 0 && pointsToRedeem < MIN_REDEEM_POINTS) {
      return "El mínimo para canjear es 200 puntos.";
    }
    if (pointsToRedeem > maxRedeemable) {
      return "Máximo 20% del total de la compra.";
    }
    return null;
  })();

  const handleCheckout = async () => {
    if (processing || hasMultipleItems || items.length === 0) return;
    const item = items[0]!;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          package_id: item.package_id,
          deposit_percent: MIN_DEPOSIT_PERCENTAGE,
          points_to_redeem: pointsToRedeem,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No se recibió la URL de pago de Stripe");
    } catch (err) {
      console.error("Error iniciando el pago:", err);
      addToast(
        "error",
        "No se pudo iniciar el pago",
        "Inténtalo de nuevo en unos segundos.",
      );
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-text">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.package_id}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4"
            >
              <img
                src={item.url_thumbnail_storage}
                alt={item.title}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium text-text">{item.title}</h3>
                <p className="text-sm text-text-muted">{item.region}</p>
              </div>
              <span className="font-semibold text-text">
                {formatCurrency(item.price, item.currency as "MXN" | "USD" | "EUR")}
              </span>
              <button
                onClick={() => removeItem(item.package_id)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-text">Resumen</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Subtotal (IVA incluido)</span>
              <span className="font-medium text-text">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-muted ml-3">
              <span>Subtotal sin IVA</span>
              <span>{formatCurrency(packageSubtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-muted ml-3">
              <span>IVA (16%)</span>
              <span>{formatCurrency(packageIVA)}</span>
            </div>

            {pointsToRedeem > 0 && (
              <div className="flex justify-between pt-1">
                <span className="text-text-muted">Puntos canjeados</span>
                <span className="font-medium text-green-600">
                  −{formatCurrency(pointsMxnValue)}
                </span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-2">
              <div className="flex justify-between">
                <span className="text-text-muted">
                  Anticipo ({(MIN_DEPOSIT_PERCENTAGE * 100)}%)
                </span>
                <span className="font-medium text-text">
                  {formatCurrency(depositAmount)}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-text">Total a pagar</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(totalToPay)}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Ganarás</span>
              <span className="font-medium text-primary">
                +{formatPoints(pointsEarned)} pts con esta compra
              </span>
            </div>
          </div>

          {user && (
            <div className="mt-5 border-t border-gray-100 pt-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <Wallet className="h-4 w-4" /> Avimo Puntos
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Tienes {formatPoints(walletBalance)} puntos ({formatCurrency(walletBalance * POINT_VALUE_MXN, "MXN")})
              </p>
              <div className="mt-3">
                <input
                  type="number"
                  min={0}
                  max={Math.min(walletBalance, maxRedeemable)}
                  value={pointsToRedeem || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setPointsToRedeem(isNaN(val) || val < 0 ? 0 : val);
                  }}
                  disabled={walletBalance < MIN_REDEEM_POINTS}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text placeholder:text-text-muted/50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-text-muted"
                  placeholder="0"
                />
                {pointsValidation && (
                  <p className="mt-1.5 text-xs text-amber-600">{pointsValidation}</p>
                )}
                {pointsToRedeem > 0 && !pointsValidation && (
                  <p className="mt-1.5 text-xs text-green-600">
                    = {formatCurrency(pointsMxnValue, "MXN")}
                  </p>
                )}
              </div>
            </div>
          )}

          {hasMultipleItems && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Por ahora solo puedes pagar <strong>un paquete a la vez</strong>.
                Deja uno en tu carrito para continuar.
              </span>
            </div>
          )}
          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={handleCheckout}
            loading={processing}
            disabled={hasMultipleItems}
          >
            Proceder al Pago
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-3 text-center text-xs text-text-muted">
            Pago seguro mediante Stripe Connect
          </p>
        </div>
      </div>
    </div>
  );
}
