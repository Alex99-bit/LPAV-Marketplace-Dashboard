// ============================================================================
// connect-account
// Crea una cuenta conectada de Stripe (API V2) donde la PLATAFORMA es
// responsable de los precios y de la recaudación de comisiones.
//
// Flujo:
//   POST /functions/v1/connect-account
//   Body: { display_name, contact_email, country? }
//
//   -> Crea la cuenta con la API V2 (v2.core.accounts.create).
//   -> Guarda el mapeo usuario -> account id en la BD (connect_accounts).
//
// REGLA IMPORTANTE (según el spec):
//   - NO pasar `type` en el nivel superior (ni 'express', 'standard' ni
//     'custom'). En su lugar se usa `dashboard: 'express'`.
//   - Solo usar las propiedades indicadas abajo al crear la cuenta.
// ============================================================================

import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req: Request) => {
  // Manejo de CORS (preflight OPTIONS).
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Requerimos usuario autenticado (es quien posee la cuenta conectada).
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parseo del cuerpo de la petición.
  let body: { display_name?: string; contact_email?: string; country?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Valores "from user", con fallback al email del usuario autenticado.
  const displayName = body.display_name || user.user_metadata?.full_name || "Mi negocio";
  const contactEmail = body.contact_email || user.email || "";
  const country = (body.country || "us").toLowerCase();

  if (!contactEmail) {
    return new Response(JSON.stringify({ error: "contact_email es requerido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Instanciamos el cliente de Stripe (valida STRIPE_SECRET_KEY).
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
  // 1. Crear la cuenta conectada con la API V2.
  //    La plataforma recauda comisiones (fees_collector: 'application') y
  //    asume las pérdidas (losses_collector: 'application').
  //    La capability `stripe_balance.stripe_transfers` permite recibir
  //    transferencias (el dinero va al saldo de Stripe del connected account).
  // --------------------------------------------------------------------------
  const account = await stripe.v2.core.accounts.create({
    display_name: displayName,
    contact_email: contactEmail,
    identity: {
      country: country,
    },
    dashboard: "express",
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: {
              requested: true,
            },
          },
        },
      },
    },
  });

  // --------------------------------------------------------------------------
  // 2. Guardar el mapeo usuario -> account id en la base de datos.
  //    (Si el usuario ya tuviera una cuenta, podrías hacer un upsert aquí.)
  // --------------------------------------------------------------------------
  const supabase = createServiceClient();
  const { error: dbError } = await supabase.from("connect_accounts").insert({
    user_id: user.id,
    stripe_account_id: account.id,
    display_name: displayName,
    contact_email: contactEmail,
    country: country,
    onboarding_status: "pending",
  });

  if (dbError) {
    return new Response(JSON.stringify({ error: dbError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ account_id: account.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
