import { Wallet } from "lucide-react";
import { formatPoints, formatCurrency } from "@/lib/formatters";
import { MIN_REDEEM_POINTS, MAX_POINTS_PERCENT_PER_PURCHASE, POINT_VALUE_MXN } from "@/lib/constants";

interface PointsSliderProps {
  balance: number;
  totalPrice: number;
  value: number;
  onChange: (points: number) => void;
}

export default function PointsSlider({ balance, totalPrice, value, onChange }: PointsSliderProps) {
  const maxRedeemable = Math.floor(totalPrice * MAX_POINTS_PERCENT_PER_PURCHASE);
  const canRedeem = balance >= MIN_REDEEM_POINTS;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    if (isNaN(raw) || raw < 0) {
      onChange(0);
      return;
    }
    const clamped = Math.min(raw, Math.min(balance, maxRedeemable));
    onChange(clamped);
  };

  const validationMessage = (): string | null => {
    if (!canRedeem) return `Necesitas mínimo ${MIN_REDEEM_POINTS.toLocaleString()} puntos para canjear.`;
    if (value > 0 && value < MIN_REDEEM_POINTS) return `El mínimo para canjear es ${MIN_REDEEM_POINTS.toLocaleString()} puntos.`;
    if (value > balance) return "No tienes suficientes puntos.";
    if (value > maxRedeemable) return `Máximo 20% del total de la compra (${maxRedeemable.toLocaleString()} pts).`;
    return null;
  };

  const msg = validationMessage();

  if (!canRedeem) {
    return (
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-5 w-5 text-text-muted" />
          <span className="font-semibold text-text">Avimo Puntos</span>
        </div>
        <p className="text-sm text-text-muted">{msg}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="font-semibold text-text">Avimo Puntos</span>
        </div>
        <span className="text-sm text-text-muted">
          Saldo: {formatPoints(balance)} pts
        </span>
      </div>
      <input
        type="number"
        min={0}
        max={Math.min(balance, maxRedeemable)}
        step={1}
        value={value}
        onChange={handleChange}
        placeholder={`0 - ${Math.min(balance, maxRedeemable).toLocaleString()} pts`}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        disabled={!canRedeem}
      />
      {value > 0 && !msg && (
        <p className="mt-1 text-xs text-success">
          = {formatCurrency(value * POINT_VALUE_MXN)} MXN de descuento
        </p>
      )}
      {msg && <p className="mt-1 text-xs text-red-500">{msg}</p>}
    </div>
  );
}
