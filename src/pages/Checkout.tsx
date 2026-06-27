import { useNavigate, Link } from "react-router";
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/formatters";
import { PLATFORM_COMMISSION_RATE, MIN_DEPOSIT_PERCENTAGE } from "@/lib/constants";
import Button from "@/components/ui/Button";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, removeItem, total } = useCart();
  useAuth();

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShoppingCart className="h-16 w-16 text-text-muted/30" />
        <h2 className="text-xl font-semibold text-text">Tu carrito está vacío</h2>
        <p className="text-sm text-text-muted">
          Explora nuestros paquetes y añade uno a tu carrito.
        </p>
        <Link to="/">
          <Button>Explorar Paquetes</Button>
        </Link>
      </div>
    );
  }

  const depositAmount = total * MIN_DEPOSIT_PERCENTAGE;
  const platformFee = depositAmount * PLATFORM_COMMISSION_RATE;
  const totalToPay = depositAmount + platformFee;

  const handleCheckout = async () => {
    navigate("/orders");
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
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-medium text-text">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">
                Anticipo ({(MIN_DEPOSIT_PERCENTAGE * 100)}%)
              </span>
              <span className="font-medium text-text">
                {formatCurrency(depositAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">
                Comisión plataforma ({(PLATFORM_COMMISSION_RATE * 100)}%)
              </span>
              <span className="font-medium text-text">
                {formatCurrency(platformFee)}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-text">Total a pagar</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(totalToPay)}
                </span>
              </div>
            </div>
          </div>
          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={handleCheckout}
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
