import Stripe from "https://esm.sh/stripe@17?target=deno";
import { createServiceClient } from "../_shared/auth.ts";

const IVA_RATE = 0.16;

interface ReceiptData {
  travelerName: string;
  packageTitle: string;
  packageSubtotal: number;
  packageIVA: number;
  total: number;
  agencyName: string;
  orderId: string;
  date: string;
}

function generateReceiptHtml(data: ReceiptData): string {
  const formatMxn = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:16px">
  <h2 style="color:#3B82F6;margin-bottom:4px">Recibo de Compra — Avimo</h2>
  <p style="margin:0 0 16px;color:#6B7280">Gracias por tu compra, <strong>${data.travelerName}</strong>.</p>
  <table style="width:100%;border-collapse:collapse">
    <tr style="border-bottom:1px solid #E5E7EB">
      <td style="padding:8px 0"><strong>${data.packageTitle}</strong></td>
      <td style="text-align:right">$${formatMxn(data.packageSubtotal + data.packageIVA)}</td>
    </tr>
    <tr style="border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px">
      <td style="padding:4px 0 8px 16px">Subtotal</td>
      <td style="text-align:right">$${formatMxn(data.packageSubtotal)}</td>
    </tr>
    <tr style="border-bottom:2px solid #111827;color:#6B7280;font-size:13px">
      <td style="padding:4px 0 8px 16px">IVA (16%)</td>
      <td style="text-align:right">$${formatMxn(data.packageIVA)}</td>
    </tr>
    <tr>
      <td style="padding:12px 0;font-size:16px"><strong>Total pagado</strong></td>
      <td style="text-align:right;font-size:16px"><strong>$${formatMxn(data.total)}</strong></td>
    </tr>
  </table>
  <p style="color:#6B7280;font-size:11px;margin:16px 0 0">
    Agencia: ${data.agencyName} &middot; Orden: #${data.orderId.slice(0,8)} &middot; ${data.date}
  </p>
  <p style="color:#9CA3AF;font-size:10px;margin:24px 0 0">
    Para factura fiscal (CFDI) del paquete, contacta directamente a la agencia.<br>
    Este recibo no es un comprobante fiscal.
  </p>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-04-30.basil" });
  const supabase = createServiceClient();

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return new Response(JSON.stringify({ error: `Webhook Error: ${(err as Error).message}` }), { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata!;

      // Pago desde chat (solicitud de pago de agencia a viajero)
      if (metadata.chat_payment === "true") {
        const chatCommissionVal = parseFloat(metadata.agency_commission || "0");
        const chatCommissionRate = parseFloat(metadata.commission_rate || "0");
        const chatAmount = session.amount_total! / 100;
        const chatCurrency = (session.currency || "mxn").toUpperCase();

        const stripeFeeBase = (session.amount_total! * 0.041 / 100) + 3;
        const stripeFeeIVA = stripeFeeBase * 0.16;
        const commSubtotal = chatCommissionVal / (1 + IVA_RATE);
        const commIVA = chatCommissionVal - commSubtotal;

        // Si es abono a una orden existente (pago diferido)
        if (metadata.order_id) {
          const { data: existingOrder } = await supabase
            .from("transactions_orders")
            .select("remaining_balance, total_amount")
            .eq("order_id", metadata.order_id)
            .single();

          if (existingOrder) {
            const newRemaining = parseFloat((existingOrder.remaining_balance - chatAmount).toFixed(2));
            const newStatus = newRemaining <= 0 ? "paid" : "partial_paid";

            await supabase.from("transactions_orders").update({
              remaining_balance: newRemaining,
              payment_status: newStatus,
              next_payment_due: newStatus === "paid" ? null
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }).eq("order_id", metadata.order_id);
          }
        }

        // Crear registro fiscal
        await supabase.from("fiscal_income_records").insert({
          order_id: metadata.order_id || null,
          tenant_id: metadata.tenant_id,
          concept: `Pago desde chat — ${metadata.concept || "Solicitud de pago"}`,
          income_type: "agency_commission",
          subtotal: parseFloat(commSubtotal.toFixed(2)),
          iva_amount: parseFloat(commIVA.toFixed(2)),
          total: chatCommissionVal,
          currency: chatCurrency,
          stripe_fee: parseFloat(stripeFeeBase.toFixed(2)),
          stripe_fee_iva: parseFloat(stripeFeeIVA.toFixed(2)),
          commission_rate_applied: chatCommissionRate,
          recorded_at: new Date().toISOString(),
        });

        // Insertar mensaje payment_confirmed en el chat
        await supabase.from("chat_messages").insert({
          conversation_id: metadata.conversation_id,
          sender_id: metadata.traveler_id || "00000000-0000-0000-0000-000000000000",
          message_text: JSON.stringify({
            amount: chatAmount,
            currency: chatCurrency,
            concept: metadata.concept,
            commission_applied: chatCommissionVal,
            commission_rate: chatCommissionRate,
            session_id: session.id,
          }),
          message_type: "payment_confirmed",
          metadata: {
            amount: chatAmount,
            currency: chatCurrency,
            concept: metadata.concept,
            stripe_session_id: session.id,
            order_id: metadata.order_id || null,
            confirmed_at: new Date().toISOString(),
          },
        });

        // Notificar al viajero
        if (metadata.traveler_id) {
          await supabase.from("notifications").insert({
            user_id: metadata.traveler_id,
            type: "payment_received",
            title: "Pago procesado",
            message: `Tu pago de ${chatAmount} ${chatCurrency} ha sido confirmado.`,
          });
        }

        break;
      }

      const userId = metadata.user_id;

      const { data: pkg } = await supabase
        .from("travel_packages")
        .select("title")
        .eq("package_id", metadata.package_id)
        .single();
      const pkgTitle = (pkg as unknown as { title: string })?.title || "Paquete";

      const packageTotal = metadata.package_total
        ? parseFloat(metadata.package_total)
        : session.amount_total! / 100;
      const pointsEarned = Math.floor(packageTotal / 100);

      const agencyCommissionVal = parseFloat(metadata.agency_commission || "0");
      const commissionRate = parseFloat(metadata.commission_rate || "0");

      const { data: order } = await supabase.from("transactions_orders").insert({
        tenant_id: metadata.tenant_id,
        stripe_checkout_session_id: session.id,
        user_id: userId,
        total_amount: session.amount_total! / 100,
        remaining_balance: (session.amount_total! / 100) * (1 / 0.2 - 1),
        currency: (session.currency || "mxn").toUpperCase() as "MXN",
        platform_commission_fee: agencyCommissionVal,
        traveler_service_fee: 0,
        agency_commission_fee: agencyCommissionVal,
        package_subtotal: parseFloat(metadata.package_subtotal || "0"),
        package_iva: parseFloat(metadata.package_iva || "0"),
        payment_status: "partial_paid",
        next_payment_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        points_earned: pointsEarned,
      }).select().single();

      if (order) {
        if (metadata.hold_id) {
          await supabase.rpc("consume_inventory_hold", {
            p_hold_id: metadata.hold_id,
            p_stripe_session_id: session.id,
          });
        } else {
          await supabase.rpc("decrement_available_rooms", {
            p_package_id: metadata.package_id,
          });
        }

        if (pointsEarned > 0) {
          await supabase.rpc("credit_points", {
            p_user_id: userId,
            p_points: pointsEarned,
            p_type: "earn",
            p_description: `Compra: ${metadata.package_id || ""}`,
            p_reference_order_id: order.id,
          });
        }

        const pointsRedeemed = parseInt(metadata.points_redeemed || "0", 10);
        if (pointsRedeemed > 0) {
          await supabase.rpc("debit_points", {
            p_user_id: userId,
            p_points: pointsRedeemed,
            p_type: "redeem",
            p_description: `Redención en compra: ${metadata.package_id || ""}`,
            p_reference_order_id: order.id,
          });
        }

        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment_received",
          title: "Pago confirmado",
          message: "Tu anticipo ha sido procesado exitosamente.",
        });

        const stripeFeeBase = (session.amount_total! * 0.041 / 100) + 3;
        const stripeFeeIVA = stripeFeeBase * 0.16;

        const agencyCommissionSubtotal = agencyCommissionVal / (1 + IVA_RATE);
        const agencyCommissionIVA = agencyCommissionVal - agencyCommissionSubtotal;

        await supabase.from("fiscal_income_records").insert({
          order_id: order.order_id,
          tenant_id: metadata.tenant_id,
          concept: `Comisión agencia — ${metadata.agency_name || ""}`,
          income_type: "agency_commission",
          subtotal: parseFloat(agencyCommissionSubtotal.toFixed(2)),
          iva_amount: parseFloat(agencyCommissionIVA.toFixed(2)),
          total: agencyCommissionVal,
          stripe_fee: parseFloat(stripeFeeBase.toFixed(2)),
          stripe_fee_iva: parseFloat(stripeFeeIVA.toFixed(2)),
          commission_rate_applied: commissionRate * 100,
          recorded_at: new Date().toISOString(),
        });

        const { data: traveler } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (traveler?.email && order) {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              to: traveler.email,
              subject: `Recibo de compra — ${pkgTitle}`,
              html: generateReceiptHtml({
                travelerName: traveler.full_name || "Viajero",
                packageTitle: pkgTitle,
                packageSubtotal: parseFloat(metadata.package_subtotal || "0"),
                packageIVA: parseFloat(metadata.package_iva || "0"),
                total: session.amount_total! / 100,
                agencyName: metadata.agency_name || "Agencia",
                orderId: order.order_id,
                date: new Date().toLocaleDateString("es-MX"),
              }),
            }),
          });
        }
      }
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;

      if (dispute.payment_intent) {
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: dispute.payment_intent as string,
          limit: 1,
        });

        if (sessions.data.length > 0) {
          const { data: order } = await supabase
            .from("transactions_orders")
            .select("*")
            .eq("stripe_checkout_session_id", sessions.data[0].id)
            .single();

          if (order) {
            const pi = await stripe.paymentIntents.retrieve(
              dispute.payment_intent as string,
            );
            const restorePkgId = pi.metadata?.package_id;
            if (restorePkgId) {
              await supabase.rpc("increment_available_rooms", {
                p_package_id: restorePkgId,
              });
            }

            if (order.points_earned > 0) {
              await supabase.rpc("debit_points", {
                p_user_id: order.user_id,
                p_points: order.points_earned,
                p_type: "reversal",
                p_description: `Disputa: ${dispute.id}`,
                p_reference_order_id: order.id,
              });
            }
          }
        }
      }

      await supabase.from("notifications").insert({
        user_id: "system",
        type: "payment_received",
        title: "Disputa bancaria",
        message: `Disputa ${dispute.id} por ${(dispute.amount / 100).toFixed(2)} ${dispute.currency}`,
        metadata: { dispute_id: dispute.id, charge_id: dispute.charge },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("saas_subscriptions")
        .update({
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("saas_subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", sub.id);

      const { data: tenantSub } = await supabase
        .from("saas_subscriptions")
        .select("tenant_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (tenantSub) {
        await supabase
          .from("agencies_tenants")
          .update({ status: "Suspendido por Pago" })
          .eq("tenant_id", tenantSub.tenant_id);

        await supabase
          .from("travel_packages")
          .update({ publication_status: "draft" })
          .eq("tenant_id", tenantSub.tenant_id)
          .eq("publication_status", "published");
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const { data: sub } = await supabase
        .from("saas_subscriptions")
        .select("tenant_id, agencies_tenants(owner_user_id)")
        .eq("stripe_subscription_id", invoice.subscription as string)
        .single();

      if (sub) {
        const graceEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("saas_subscriptions")
          .update({ grace_period_end: graceEnd })
          .eq("tenant_id", (sub as unknown as { tenant_id: string }).tenant_id);

        const agency = (sub as unknown as { agencies_tenants: { owner_user_id: string } }).agencies_tenants;
        if (agency?.owner_user_id) {
          await supabase.from("notifications").insert({
            user_id: agency.owner_user_id,
            type: "payment_received",
            title: "Pago de suscripción fallido",
            message: "Tu pago no pudo procesarse. Tienes 15 días de gracia.",
          });
        }
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
