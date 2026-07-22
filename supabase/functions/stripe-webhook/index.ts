import Stripe from "https://esm.sh/stripe@17?target=deno";
import { createServiceClient } from "../_shared/auth.ts";

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
      const userId = metadata.user_id;

      const packageTotal = metadata.package_total
        ? parseFloat(metadata.package_total)
        : session.amount_total! / 100;
      const pointsEarned = Math.floor(packageTotal / 100);

      const { data: order } = await supabase
        .from("transactions_orders")
        .insert({
          tenant_id: metadata.tenant_id,
          stripe_checkout_session_id: session.id,
          user_id: userId,
          total_amount: session.amount_total! / 100,
          remaining_balance: (session.amount_total! / 100) * (1 / 0.2 - 1),
          currency: (session.currency || "mxn").toUpperCase() as "MXN",
          platform_commission_fee: (session.amount_total! * 0.1508) / 100,
          payment_status: "partial_paid",
          next_payment_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          points_earned: pointsEarned,
        })
        .select()
        .single();

      if (order) {
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
      }
      break;
    }

    case "charge.dispute.created": {
      // DORMANT: modelo SaaS inactivo
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

          if (order && order.points_earned > 0) {
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
      // DORMANT: modelo SaaS inactivo
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
      // DORMANT: modelo SaaS inactivo
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
      // DORMANT: modelo SaaS inactivo
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
