import { useState, useEffect } from "react";
import { CheckCircle, XCircle, ExternalLink, ChevronDown, HelpCircle, Landmark, ArrowDownLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Button from "@/components/ui/Button";

interface StripeConnectStatusProps {
  stripeAccountId: string | null;
}

interface TransferInfo {
  id: string;
  amount: number;
  currency: string;
  created: string;
}

export default function StripeConnectStatus({ stripeAccountId }: StripeConnectStatusProps) {
  const [loading, setLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [transfers, setTransfers] = useState<TransferInfo[]>([]);

  useEffect(() => {
    if (!stripeAccountId) return;
    supabase.functions.invoke("get-agency-transfers")
      .then(({ data }) => {
        setTransfers((data as { transfers: TransferInfo[] })?.transfers ?? []);
      })
      .catch(() => {});
  }, [stripeAccountId]);

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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text">Cuenta Bancaria para Cobros</h3>
            <p className="text-xs text-text-muted">Recibe depósitos directos de viajeros</p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 p-4">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">Cuenta bancaria no registrada</p>
            <p className="mt-1 text-xs text-amber-600">
              Registra tu cuenta bancaria (CLABE de 18 dígitos) para que podamos depositarte
              automáticamente los pagos de tus viajeros.
            </p>
          </div>
        </div>

        <Button className="mt-4 w-full" onClick={handleConnect} loading={loading}>
          Registrar cuenta bancaria
          <ExternalLink className="h-4 w-4" />
        </Button>

        {/* CLABE Guide */}
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-text-muted transition-colors hover:bg-gray-50"
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">¿Qué es la CLABE y dónde la encuentro?</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${guideOpen ? "rotate-180" : ""}`} />
        </button>

        {guideOpen && <ClabelGuide />}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text">Cuenta Bancaria para Cobros</h3>
          <p className="text-xs text-text-muted">Recibe depósitos directos de viajeros</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Cuenta bancaria registrada</p>
          <p className="text-xs text-emerald-600">
            Los pagos de viajeros se depositan directamente en tu cuenta bancaria.
          </p>
        </div>
      </div>

      {transfers.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownLeft className="h-4 w-4 text-text-muted" />
            <h4 className="text-sm font-semibold text-text">Últimas Transferencias Recibidas</h4>
          </div>
          <div className="space-y-2">
            {transfers.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-text">{formatCurrency(t.amount, t.currency as "MXN" | "USD" | "EUR")}</p>
                  <p className="text-xs text-text-muted">{formatDate(t.created)}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClabelGuide() {
  return (
    <div className="mt-2 rounded-xl bg-blue-50 p-4 text-sm">
      <p className="font-semibold text-blue-800">¿Qué es la CLABE?</p>
      <p className="mt-1 text-xs text-blue-700">
        La Clave Bancaria Estandarizada es un número de <strong>18 dígitos</strong> que
        identifica tu cuenta bancaria en México. Es el número que necesitas para recibir
        transferencias SPEI de cualquier banco.
      </p>

      <p className="mt-3 font-semibold text-blue-800">¿Dónde la encuentro?</p>
      <ul className="mt-1 space-y-1 text-xs text-blue-700">
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
          En tu <strong>estado de cuenta</strong> (banca en línea o app de tu banco)
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
          En la <strong>app móvil</strong> de tu banco, sección "Mis cuentas"
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
          Llamando a la <strong>línea de atención</strong> de tu banco
        </li>
      </ul>

      <p className="mt-3 font-semibold text-blue-800">Ejemplo:</p>
      <p className="mt-1 font-mono text-xs text-blue-700">012 345 678 901 234 567</p>

      <p className="mt-3 font-semibold text-blue-800">Bancos compatibles:</p>
      <p className="mt-1 text-xs text-blue-700">
        BBVA, Banorte, Santander, Banamex, HSBC, Scotiabank, Banregio, Inbursa,
        y todos los bancos regulados en México.
      </p>
    </div>
  );
}
