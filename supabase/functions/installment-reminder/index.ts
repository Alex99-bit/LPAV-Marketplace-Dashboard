import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createServiceClient();
  const stripe = getStripeClient();

  const now = new Date();
  const { data: dueInstallments } = await supabase
    .from("installment_schedules")
    .select("*, transactions_orders(user_id, tenant_id, currency, agencies_tenants(stripe_account_id, business_name))")
    .eq("status", "pending")
    .lte("due_date", new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString())
    .is("reminder_sent_at", null);

  if (!dueInstallments?.length) {
    return new Response(JSON.stringify({ reminded: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let reminded = 0;
  const origin = Deno.env.get("VITE_APP_URL") || "http://localhost:5173";

  for (const inst of dueInstallments) {
    const order = inst.transactions_orders as unknown as {
      user_id: string; tenant_id: string; currency: string;
      agencies_tenants: { stripe_account_id: string; business_name: string };
    };

    if (!order?.agencies_tenants?.stripe_account_id) continue;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: (order.currency || "mxn").toLowerCase(),
          product_data: { name: `Abono ${inst.installment_number} - LPAV` },
          unit_amount: Math.round(Number(inst.amount_due) * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/orders?installment=${inst.installment_id}`,
      cancel_url: `${origin}/orders`,
      metadata: {
        installment_id: inst.installment_id,
        order_id: inst.order_id,
        user_id: order.user_id,
        tenant_id: order.tenant_id,
      },
    }, { stripeAccount: order.agencies_tenants.stripe_account_id });

    await supabase
      .from("installment_schedules")
      .update({ stripe_checkout_url: session.url, reminder_sent_at: now.toISOString() })
      .eq("installment_id", inst.installment_id);

    await supabase.from("payment_reminders").insert({
      installment_id: inst.installment_id,
      channel: "email",
    });

    await supabase.from("notifications").insert({
      user_id: order.user_id,
      type: "payment_received",
      title: `Abono ${inst.installment_number} pendiente`,
      message: `Tu abono de $${inst.amount_due} ${order.currency} vence el ${new Date(inst.due_date).toLocaleDateString("es-MX")}.`,
      metadata: { checkout_url: session.url, installment_id: inst.installment_id },
    });

    reminded++;
  }

  return new Response(JSON.stringify({ reminded }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
