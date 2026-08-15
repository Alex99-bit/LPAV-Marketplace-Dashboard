// ============================================================================
// connect-products
// Crea y lista productos a NIVEL DE PLATAFORMA (no en la cuenta conectada).
//
// Endpoints:
//   POST /functions/v1/connect-products   -> crear producto
//     Body: { name, description?, price_in_cents, currency?, connected_account_id }
//
//   GET  /functions/v1/connect-products   -> listar productos (storefront)
//
// El mapeo producto -> cuenta conectada se guarda en el `metadata` del producto
// (metadata.connected_account_id). Alternativamente podrías guardarlo en BD.
// ============================================================================

import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";
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

  // --------------------------------------------------------------------------
  // GET: listar todos los productos para el storefront.
  // --------------------------------------------------------------------------
  if (req.method === "GET") {
    const products = await stripe.products.list({
      limit: 100,
      expand: ["data.default_price"], // traemos el precio junto al producto
    });

    // Mapeamos a una forma simple para el frontend.
    const items = products.data.map((p) => {
      const price = p.default_price as unknown as {
        unit_amount?: number;
        currency?: string;
      } | null;
      return {
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        price_in_cents: price?.unit_amount ?? null,
        currency: price?.currency ?? "mxn",
        connected_account_id: p.metadata?.connected_account_id ?? null,
      };
    });

    return new Response(JSON.stringify({ products: items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --------------------------------------------------------------------------
  // POST: crear producto (requiere usuario autenticado).
  // --------------------------------------------------------------------------
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    name?: string;
    description?: string;
    price_in_cents?: number;
    currency?: string;
    connected_account_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.name || !body.price_in_cents || !body.connected_account_id) {
    return new Response(
      JSON.stringify({
        error: "name, price_in_cents y connected_account_id son requeridos",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const currency = (body.currency || "mxn").toLowerCase();

  // Crear el producto a nivel plataforma con un precio por defecto.
  const product = await stripe.products.create({
    name: body.name,
    description: body.description ?? "",
    default_price_data: {
      unit_amount: body.price_in_cents,
      currency: currency,
    },
    // Guardamos el mapeo producto -> cuenta conectada en metadata.
    metadata: {
      connected_account_id: body.connected_account_id,
    },
  });

  return new Response(
    JSON.stringify({
      id: product.id,
      name: product.name,
      connected_account_id: body.connected_account_id,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
