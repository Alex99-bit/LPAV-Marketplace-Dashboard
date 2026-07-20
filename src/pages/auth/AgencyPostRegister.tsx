import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  CreditCard,
  Landmark,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  SkipForward,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import type { SubscriptionTier } from "@/types";

interface LocationState {
  tenantId?: string;
  plan?: SubscriptionTier;
}

export default function AgencyPostRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const state = location.state as LocationState;
  const tenantId = state?.tenantId || profile?.tenant_id;
  const plan = state?.plan || "Gratuito";

  const [stripeConnectLoading, setStripeConnectLoading] = useState(false);
  const [stripeBillingLoading, setStripeBillingLoading] = useState(false);
  const [stripeConnectDone, setStripeConnectDone] = useState(false);
  const [stripeBillingDone, setStripeBillingDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

  // Check current Stripe status
  useEffect(() => {
    const checkStatus = async () => {
      if (!tenantId) {
        navigate("/agency/dashboard");
        return;
      }

      const { data } = await supabase
        .from("agencies_tenants")
        .select("stripe_account_id, stripe_subscription_id")
        .eq("tenant_id", tenantId)
        .single();

      if (data?.stripe_account_id) setStripeConnectDone(true);
      if (data?.stripe_subscription_id) setStripeBillingDone(true);
      setLoading(false);
    };

    checkStatus();
  }, [tenantId, navigate]);

  const handleConnectStripe = async () => {
    setStripeConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-connect-account"
      );
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Error connecting Stripe:", err);
      addToast("error", "No se pudo conectar Stripe", "Inténtalo de nuevo o sáltate este paso y configúralo en Configuración.");
    } finally {
      setStripeConnectLoading(false);
    }
  };

  const handleSetupBilling = async () => {
    setStripeBillingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-subscription",
        { body: { action: "create", plan_tier: plan } }
      );
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Error setting up billing:", err);
      addToast("error", "No se pudo configurar la suscripción", "Inténtalo de nuevo o sáltate este paso y configúralo después.");
    } finally {
      setStripeBillingLoading(false);
    }
  };

  const handleSkip = async () => {
    await refreshProfile();
    navigate("/agency/dashboard", { replace: true });
  };

  const handleContinue = async () => {
    await refreshProfile();
    navigate("/agency/dashboard", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const isFreePlan = plan === "Gratuito";
  const bothDone = stripeConnectDone && (isFreePlan || stripeBillingDone);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-success/10 text-success mx-auto">
          <CheckCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-text">Agencia Registrada</h1>
        <p className="mt-2 text-sm text-text-muted">
          Tu agencia ha sido creada exitosamente. Ahora configura tu cuenta de
          cobro para comenzar a operar.
        </p>
      </div>

      <div className="w-full space-y-4">
        {/* Step 1: Cuenta bancaria para cobros */}
        <div
          className={`rounded-2xl border-2 p-5 transition-colors ${
            stripeConnectDone
              ? "border-success bg-success/5"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                stripeConnectDone
                  ? "bg-success text-white"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {stripeConnectDone ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Landmark className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text">
                Cuenta Bancaria para Recibir Pagos
              </h3>
              <p className="text-xs text-text-muted">
                Registra tu CLABE (18 dígitos) para que te depositemos automáticamente
              </p>
            </div>
          </div>

          {!stripeConnectDone ? (
            <>
              <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
                Solo necesitas tu <strong>CLABE bancaria</strong> y tu{" "}
                <strong>INE</strong>. No necesitas crear cuenta en ningún servicio
                externo — el pago llega directo a tu banco.
              </div>
              <Button
                className="mt-3 w-full"
                onClick={handleConnectStripe}
                loading={stripeConnectLoading}
              >
                Registrar cuenta bancaria
                <ExternalLink className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setGuideOpen(!guideOpen)}
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-text-muted transition-colors hover:bg-gray-50"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">¿Qué es la CLABE y dónde la encuentro?</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${guideOpen ? "rotate-180" : ""}`} />
              </button>
              {guideOpen && (
                <div className="mt-2 rounded-xl bg-blue-50 p-4 text-xs">
                  <p className="font-semibold text-blue-800">¿Qué es la CLABE?</p>
                  <p className="mt-1 text-blue-700">
                    La Clave Bancaria Estandarizada es un número de <strong>18 dígitos</strong> que
                    identifica tu cuenta bancaria en México.
                  </p>
                  <p className="mt-2 font-semibold text-blue-800">¿Dónde la encuentro?</p>
                  <ul className="mt-1 space-y-1 text-blue-700">
                    <li>- En tu estado de cuenta (banca en línea o app de tu banco)</li>
                    <li>- En la app móvil de tu banco, sección "Mis cuentas"</li>
                    <li>- Llamando a la línea de atención de tu banco</li>
                  </ul>
                  <p className="mt-2 font-semibold text-blue-800">Ejemplo:</p>
                  <p className="mt-1 font-mono text-blue-700">012 345 678 901 234 567</p>
                </div>
              )}
            </>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              Cuenta bancaria registrada
            </div>
          )}
        </div>

        {/* Step 2: Stripe Billing (solo planes de pago) */}
        {!isFreePlan && (
          <div
            className={`rounded-2xl border-2 p-5 transition-colors ${
              stripeBillingDone
                ? "border-success bg-success/5"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  stripeBillingDone
                    ? "bg-success text-white"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {stripeBillingDone ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text">
                  Facturación de Suscripción
                </h3>
                <p className="text-xs text-text-muted">
                  Configura el cobro recurrente del plan{" "}
                  <span className="font-medium text-primary">{plan}</span>
                </p>
              </div>
            </div>

            {!stripeBillingDone ? (
              <Button
                className="mt-4 w-full"
                onClick={handleSetupBilling}
                loading={stripeBillingLoading}
              >
                Configurar Suscripción
                <ExternalLink className="h-4 w-4" />
              </Button>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                Suscripción configurada
              </div>
            )}
          </div>
        )}

        {/* Info note for free plan */}
        {isFreePlan && !stripeConnectDone && (
          <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium">Plan Gratuito</p>
            <p className="mt-1 text-xs text-blue-600">
              Puedes registrar tu cuenta bancaria ahora o hacerlo más adelante
              desde Configuración.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          {!isFreePlan && !bothDone && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
            >
              <SkipForward className="h-4 w-4" />
              Configurar después
            </Button>
          )}

          <Button
            size="lg"
            className="flex-1"
            onClick={handleContinue}
          >
            Ir al Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
