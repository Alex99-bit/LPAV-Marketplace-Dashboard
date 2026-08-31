// ============================================================================
// Controller: /functions/v1/fundador-continuity  (invocado por cron diario)
//
// Procesa las agencias Plan Fundador cuyo año gratuito venció y fueron marcadas
// con fundador_continuity_pending = TRUE por check_fundador_expirations().
//
// Crea una suscripción Stripe de "Continuidad Fundador" ($2,999 MXN/mes),
// conservando los beneficios y la comisión 7.5% (Opción A del DOC, Secc 1.1.5).
// Si la agencia no tiene método de pago, entra en periodo de gracia de 15 días
// (Secc 1.2) y la orden de continuidad se reintenta al día siguiente.
// ============================================================================

import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";

const FUNDADOR_CONTINUITY_PRICE =
  Deno.env.get("STRIPE_PRICE_FUNDADOR_CONTINUITY_MONTHLY") ||
  "price_1U6mgj0Fcaofr3eiYwW5plXb";

const GRACE_DAYS = 15;

const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Authenticate cron invocation via shared secret header
  const authHeader = req.headers.get("authorization") || "";
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    return await handle(req, corsHeaders);
  } catch (err) {
    const e = err as { message?: string; stack?: string };
    console.error("fundador-continuity error:", e?.stack || e?.message || String(err));
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handle(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const supabase = createServiceClient();
  const stripe = getStripeClient();

  // 1. Obtener agencias Fundador pendientes de continuidad
  const { data: pending, error: pendingError } = await supabase
    .from("agencies_tenants")
    .select("tenant_id, business_name, owner_user_id, stripe_customer_id")
    .eq("fundador_continuity_pending", true)
    .eq("plan_type", "Fundador")
    .eq("status", "Activo");

  if (pendingError) {
    return new Response(JSON.stringify({ error: pendingError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Record<string, unknown>[] = [];

  for (const agency of (pending ?? []) as Array<{
    tenant_id: string;
    business_name: string;
    owner_user_id: string;
    stripe_customer_id: string | null;
  }>) {
    // Sin customer de Stripe Billing => no podemos suscribir; entra en gracia.
    if (!agency.stripe_customer_id) {
      await applyGracePeriod(supabase, agency.tenant_id, agency.owner_user_id);
      results.push({ tenant_id: agency.tenant_id, status: "grace_period" });
      continue;
    }

    try {
      const subscription = await stripe.subscriptions.create({
        customer: agency.stripe_customer_id,
        items: [{ price: FUNDADOR_CONTINUITY_PRICE }],
        metadata: {
          tenant_id: agency.tenant_id,
          plan: "Fundador",
          fundador_continuity: "true",
        },
      });

      // Marcar como activa la continuidad y limpiar el flag pendiente
      await supabase
        .from("agencies_tenants")
        .update({
          fundador_continuity_active: true,
          fundador_continuity_pending: false,
        })
        .eq("tenant_id", agency.tenant_id);

      // Registrar/actualizar la suscripción SaaS
      await supabase
        .from("saas_subscriptions")
        .upsert({
          tenant_id: agency.tenant_id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: agency.stripe_customer_id,
          plan_tier: "Fundador",
          billing_cycle: "monthly",
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: "tenant_id" });

      await supabase.from("notifications").insert({
        user_id: agency.owner_user_id,
        type: "payment_received",
        title: "Continuidad Fundador activada",
        message: "Tu suscripción de Continuidad Fundador ($2,999/mes, comisión 7.5%) ha sido creada.",
        metadata: { tenant_id: agency.tenant_id },
      });

      results.push({ tenant_id: agency.tenant_id, status: "subscribed", subscription_id: subscription.id });
    } catch (err) {
      const e = err as { code?: string; message?: string; raw?: { code?: string; message?: string } };
      const code = e?.raw?.code || e?.code || "";
      const msg = (e?.raw?.message || e?.message || "").toLowerCase();

      // Sin método de pago o cliente inválido => periodo de gracia
      const missingPayment =
        code === "missing_payment_information" ||
        code === "payment_intent_requires_payment_method" ||
        code === "no_payment_method" ||
        code === "resource_missing" ||
        msg.includes("no attached payment source") ||
        msg.includes("payment method") ||
        msg.includes("payment_method");

      if (missingPayment) {
        await applyGracePeriod(supabase, agency.tenant_id, agency.owner_user_id);
        results.push({ tenant_id: agency.tenant_id, status: "grace_period", error: code || msg });
      } else {
        results.push({ tenant_id: agency.tenant_id, status: "error", error: code || msg });
      }
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function applyGracePeriod(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  ownerUserId: string,
): Promise<void> {
  const graceEnd = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("saas_subscriptions")
    .upsert({
      tenant_id: tenantId,
      plan_tier: "Fundador",
      billing_cycle: "monthly",
      status: "past_due",
      grace_period_end: graceEnd,
    }, { onConflict: "tenant_id" });

  await supabase.from("notifications").insert({
    user_id: ownerUserId,
    type: "payment_received",
    title: "Continuidad Fundador — Método de pago requerido",
    message: `No pudimos cobrar tu Continuidad Fundador ($2,999/mes). Tienes ${GRACE_DAYS} días de gracia para registrar un método de pago.`,
    metadata: { tenant_id: tenantId, grace_period_end: graceEnd },
  });
}
