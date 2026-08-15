// ============================================================================
// connect-webhook
// Recibe y procesa los eventos de Stripe para la muestra de Connect.
//
// Maneja DOS tipos de notificaciones (ambas llegan con header Stripe-Signature
// y se verifican con el mismo STRIPE_WEBHOOK_SECRET):
//
//   A) Eventos V1 (payload completo) — p. ej. checkout.session.completed.
//   B) Thin events V2 — p. ej. cambios en requisitos o capabilities de una
//      cuenta conectada.
//
// --------------------------------------------------------------------------
// Configuración del dashboard (thin events V2):
//   Developers -> Webhooks -> Add destination:
//     - Events from: "Connected accounts"
//     - Show advanced options -> Payload style: "Thin"
//     - Eventos: v2.account[requirements].updated
//                v2.account[configuration.configuration_type].capability_status_updated
//       (para 'recipient' => v2.core.account[.recipient].capability_status_updated)
//
// Para desarrollo local con el Stripe CLI:
//   stripe listen --thin-events \
//     'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' \
//     --forward-thin-to <TU_ENDPOINT_LOCAL>
//
// Docs thin events: https://docs.stripe.com/webhooks (snapshot-or-thin=thin)
// ============================================================================

import { createServiceClient } from "../_shared/auth.ts";
import { getStripeClient, getWebhookSecret } from "../_shared/stripe.ts";

Deno.serve(async (req: Request) => {
  const supabase = createServiceClient();

  // El cliente y el secreto se validan al inicio (errores claros si faltan).
  let stripe;
  let webhookSecret;
  try {
    stripe = getStripeClient();
    webhookSecret = getWebhookSecret();
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Falta Stripe-Signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --------------------------------------------------------------------------
  // Detectar el tipo de evento:
  //   - `constructEvent` verifica eventos V1 (payload completo).
  //   - `parseThinEvent` verifica thin events V2.
  // Ambos lanzan si la firma no es válida. Intentamos V1 primero y, si falla,
  // asumimos que es un thin event V2.
  // --------------------------------------------------------------------------
  let event: any = null;
  let thinEvent: any = null;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (_v1Error) {
    try {
      thinEvent = stripe.parseThinEvent(payload, signature, webhookSecret);
    } catch (_thinError) {
      return new Response(JSON.stringify({ error: "Firma no válida" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ==========================================================================
  // A) THIN EVENTS (V2): cambios en requisitos / capabilities de la cuenta.
  //    El thin event solo trae el id; hay que recuperar el evento completo.
  // ==========================================================================
  if (thinEvent) {
    // Recuperamos el detalle completo del evento para saber qué pasó.
    const fullEvent = await stripe.v2.core.events.retrieve(thinEvent.id);

    switch (fullEvent.type) {
      // Requisitos de la cuenta cambiaron (reguladores, card networks, etc.).
      case "v2.core.account[requirements].updated": {
        // Extraemos el id de la cuenta relacionada y refrescamos su estado.
        const accountId = extractAccountId(fullEvent);
        if (accountId) {
          await refreshAccountStatus(supabase, stripe, accountId);
        }
        console.log(`[connect-webhook] requisitos actualizados: ${accountId ?? "n/a"}`);
        break;
      }

      // El estado de una capability cambió (p. ej. recipient habilitado).
      case "v2.core.account[.recipient].capability_status_updated": {
        const accountId = extractAccountId(fullEvent);
        if (accountId) {
          await refreshAccountStatus(supabase, stripe, accountId);
        }
        console.log(`[connect-webhook] capability actualizada: ${accountId ?? "n/a"}`);
        break;
      }

      default:
        console.log(`[connect-webhook] thin event sin handler: ${fullEvent.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ==========================================================================
  // B) EVENTOS V1
  // ==========================================================================
  switch (event.type) {
    // Pago completado: registramos el cumplimiento de la orden.
    case "checkout.session.completed": {
      const session = event.data.object;
      const meta = session.metadata ?? {};

      // La comisión exacta vive en el PaymentIntent; para la muestra guardamos
      // null y podrías recuperarla con stripe.paymentIntents.retrieve(...).
      await supabase.from("connect_orders").insert({
        checkout_session_id: session.id,
        product_id: meta.product_id ?? null,
        connected_account_id: meta.connected_account_id ?? null,
        amount_total: session.amount_total ?? 0,
        currency: session.currency ?? "mxn",
        application_fee_amount: null,
        customer_email: session.customer_details?.email ?? null,
        status: "paid",
      });

      console.log(`[connect-webhook] orden registrada: ${session.id}`);
      break;
    }

    default:
      console.log(`[connect-webhook] evento V1 sin handler: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ----------------------------------------------------------------------------
// extractAccountId
// Intenta obtener el id de la cuenta conectada desde las distintas ubicaciones
// en las que aparece dentro de un evento V2 completo.
// ----------------------------------------------------------------------------
function extractAccountId(fullEvent: any): string | null {
  return (
    fullEvent?.data?.id ??
    fullEvent?.related_object?.id ??
    fullEvent?.data?.object?.id ??
    null
  );
}

// ----------------------------------------------------------------------------
// refreshAccountStatus
// Vuelve a consultar la cuenta en la API V2 y actualiza onboarding_status en
// la BD local. (En producción podrías además notificar al usuario.)
// ----------------------------------------------------------------------------
async function refreshAccountStatus(
  supabase: any,
  stripe: any,
  accountId: string,
): Promise<void> {
  try {
    const account = await stripe.v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient", "requirements"],
    });

    const readyToReceive =
      account?.configuration?.recipient?.capabilities?.stripe_balance
        ?.stripe_transfers?.status === "active";

    const requirementsStatus =
      account.requirements?.summary?.minimum_deadline?.status;

    await supabase
      .from("connect_accounts")
      .update({
        onboarding_status: readyToReceive ? "active" : requirementsStatus ?? "pending",
      })
      .eq("stripe_account_id", accountId);
  } catch (err) {
    console.error(`[connect-webhook] error refrescando ${accountId}:`, err);
  }
}
