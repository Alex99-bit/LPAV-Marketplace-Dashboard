import { useState } from "react";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";

interface StripeConnectStatusProps {
  stripeAccountId: string | null;
  tenantId: string;
}

export default function StripeConnectStatus({ stripeAccountId }: StripeConnectStatusProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!stripeAccountId) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-semibold text-text">Stripe Connect</h3>
        <div className="mt-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-text-muted">No has conectado Stripe aún.</p>
        </div>
        <Button className="mt-4" onClick={handleConnect} loading={loading}>
          Conectar Stripe
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Stripe Connect</h3>
      <div className="mt-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-text">Cuenta conectada</p>
          <p className="text-xs text-text-muted font-mono">{stripeAccountId}</p>
        </div>
      </div>
    </div>
  );
}
