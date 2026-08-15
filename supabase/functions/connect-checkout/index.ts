// ============================================================================
// connect-checkout
// Crea una sesión de Checkout (hosted) usando un "Destination Charge" con una
// comisión de aplicación (application fee) para monetizar la transacción.
//
// Flujo:
//   POST /functions/v1/connect-checkout
//   Body: { product_id, quantity?, application_fee_amount? }
//
//   -> Recupera el producto (y su precio) a nivel plataforma.
//   -> Lee el mapeo producto -> cuenta conectada desde el metadata.
//   -> Crea la sesión de checkout con:
//        payment_intent_data.application_fee_amount  (comisión plataforma)
//        payment_intent_data.transfer_data.destination (cuenta conectada)
//   -> Devuelve { url } para redirigir al Checkout alojado de Stripe.
//
// El resto del dinero (monto total - application fee) se transfiere
// automáticamente a la cuenta conectada al completar el pago.
// ============================================================================

import { getCorsHeaders } from "../_shared/cors.ts";
import { getStripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    product_id?: string;
    quantity?: number;
    application_fee_amount?: number;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.product_id) {
    return new Response(JSON.stringify({ error: "product_id es requerido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const quantity = body.quantity ?? 1;

  // --------------------------------------------------------------------------
  // Recuperar el producto con su precio por defecto (expand) para leer:
  //   - el price id
  //   - el unit_amount (para calcular la comisión si no se envió)
  //   - el mapeo a la cuenta conectada (metadata.connected_account_id)
  // --------------------------------------------------------------------------
  const product = await stripe.products.retrieve(body.product_id, {
    expand: ["default_price"],
  });

  const price = product.default_price as unknown as {
    id?: string;
    unit_amount?: number;
  } | null;

  if (!price?.id) {
    return new Response(JSON.stringify({ error: "El producto no tiene precio" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // El destino del pago: la cuenta conectada dueña del producto.
  const connectedAccountId = product.metadata?.connected_account_id;
  if (!connectedAccountId) {
    return new Response(
      JSON.stringify({ error: "El producto no tiene cuenta conectada asignada" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Comisión de la plataforma: si no se envía, usamos 10% del monto (muestra).
  const unitAmount = price.unit_amount ?? 0;
  const applicationFeeAmount =
    body.application_fee_amount ?? Math.round(unitAmount * quantity * 0.1);

  const origin = req.headers.get("origin") || "http://localhost:5173";

  // --------------------------------------------------------------------------
  // Crear la sesión de Checkout con destination charge + application fee.
  // --------------------------------------------------------------------------
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: price.id,
        quantity: quantity,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: connectedAccountId,
      },
      metadata: {
        product_id: body.product_id,
        connected_account_id: connectedAccountId,
      },
    },
    success_url: `${origin}/connect-demo?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/connect-demo`,
  });

  return new Response(
    JSON.stringify({
      id: session.id,
      url: session.url,
      application_fee_amount: applicationFeeAmount,
      connected_account_id: connectedAccountId,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
