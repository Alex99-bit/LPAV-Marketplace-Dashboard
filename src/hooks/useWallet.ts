import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useWallet(userId: string | undefined) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBalance(0);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("user_wallets")
      .select("points_balance")
      .eq("user_id", userId)
      .maybeSingle();

    setBalance(data?.points_balance ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();

    if (!userId) return;

    const channel = supabase
      .channel(`wallet-${userId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "user_wallets",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setBalance((payload.new as { points_balance: number }).points_balance);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, refresh]);

  return { balance, loading, refresh };
}
