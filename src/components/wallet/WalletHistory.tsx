import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Star, Gift, RotateCcw, UserPlus, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatPoints, formatDateTime } from "@/lib/formatters";
import type { WalletTransaction } from "@/types";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";

const TYPE_ICONS: Record<string, React.ElementType> = {
  earn: ArrowDown,
  redeem: ArrowUp,
  reversal: RotateCcw,
  bonus: Gift,
  referral: UserPlus,
  review: MessageSquare,
};

const TYPE_LABELS: Record<string, string> = {
  earn: "Compra",
  redeem: "Canje",
  reversal: "Reversión",
  bonus: "Bono",
  referral: "Referido",
  review: "Reseña",
};

const TYPE_COLORS: Record<string, "success" | "danger" | "warning" | "info" | "default"> = {
  earn: "success",
  redeem: "danger",
  reversal: "danger",
  bonus: "success",
  referral: "success",
  review: "info",
};

export default function WalletHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("points_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) setBalance(wallet.points_balance);

      const { data: txs } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (txs) setTransactions(txs as WalletTransaction[]);
      setLoading(false);
    };

    load();
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-text-muted">Inicia sesión para ver tu cartera de puntos.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-2">Avimo Puntos</h1>
      <p className="text-sm text-text-muted mb-6">
        Acumula puntos con cada compra y canjéalos en tus próximos viajes.
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">Saldo actual</p>
            <p className="text-3xl font-bold text-text">{formatPoints(balance)}</p>
            <p className="text-sm text-text-muted">= ${balance.toLocaleString("es-MX")} MXN</p>
          </div>
          <div className="rounded-full bg-primary/10 p-4">
            <Star className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-text mb-4">Historial de Movimientos</h2>

      {transactions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <Gift className="h-8 w-8 text-text-muted mx-auto mb-2" />
          <p className="text-text-muted">Aún no tienes movimientos.</p>
          <p className="text-sm text-text-muted mt-1">
            Realiza tu primera compra para empezar a acumular puntos.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const Icon = TYPE_ICONS[tx.type] || Star;
            const isPositive = tx.points > 0;
            return (
              <div
                key={tx.transaction_id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isPositive ? "bg-success/10 text-success" : "bg-red-50 text-red-500"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text">
                        {tx.description || TYPE_LABELS[tx.type] || tx.type}
                      </p>
                      <Badge variant={TYPE_COLORS[tx.type] || "default"}>
                        {TYPE_LABELS[tx.type] || tx.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                      {formatDateTime(tx.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  isPositive ? "text-success" : "text-red-500"
                }`}>
                  {isPositive ? "+" : ""}{formatPoints(tx.points)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
