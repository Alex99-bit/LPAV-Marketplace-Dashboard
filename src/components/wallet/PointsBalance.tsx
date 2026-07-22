import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatPoints } from "@/lib/formatters";

export default function PointsBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    
    const loadBalance = async () => {
      const { data } = await supabase
        .from("user_wallets")
        .select("points_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) setBalance(data.points_balance);
    };
    
    loadBalance();

    const channel = supabase
      .channel("wallet-updates")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "user_wallets",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setBalance((payload.new as { points_balance: number }).points_balance);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-text-muted hover:text-primary transition-colors" title={`${formatPoints(balance)} puntos = $${balance.toLocaleString("es-MX")} MXN`}>
      <Wallet className="h-4 w-4" />
      <span className="font-medium">{formatPoints(balance)}</span>
    </div>
  );
}
