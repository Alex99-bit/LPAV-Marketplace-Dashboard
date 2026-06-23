import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // NOTA: La integracion real de Stripe webhooks esta pendiente de API keys.
  // La verificacion de firma requiere STRIPE_WEBHOOK_SECRET.
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  const supabase = createServiceClient();

  // Estructura lista para activar cuando se tengan las keys de Stripe.
  if (!stripeWebhookSecret || stripeWebhookSecret === "whsec_placeholder") {
    // Modo sin Stripe: procesar body como evento mock
    let event: { type: string; data: { object: Record<string, unknown> } };
    try {
      event = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[MOCK] Webhook recibido: ${event.type}`);

    return new Response(
      JSON.stringify({ received: true, mode: "mock", event: event.type }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // --- Codigo real de Stripe Webhook (activar con API keys validas) ---
  /*
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Falta stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const Stripe = await import("npm:stripe");
  const stripe = new Stripe.default(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-06-16.acacia",
  });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      signature,
      stripeWebhookSecret,
    );
  } catch {
    return new Response(JSON.stringify({ error: "Firma invalida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Crear registro en transactions_orders
      await supabase.from("transactions_orders").insert({
        tenant_id: session.metadata?.tenant_id,
        stripe_checkout_session_id: session.id,
        user_id: session.metadata?.user_id,
        total_amount: session.amount_total! / 100,
        remaining_balance: (session.metadata?.total_package_amount || session.amount_total!) / 100 - session.amount_total! / 100,
        currency: session.currency?.toUpperCase(),
        platform_commission_fee: session.application_fee_amount! / 100,
        payment_status: "pending",
      });
      break;
    }

    case "payment_intent.succeeded": {
      const intent = event.data.object;
      // Para pagos diferidos: actualizar remaining_balance y next_payment_due
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      // Actualizar estado de la agencia a Suspendido por Pago
      break;
    }
  }
  */

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
