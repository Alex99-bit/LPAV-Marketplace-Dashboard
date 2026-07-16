import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

const PLAN_PRICES: Record<string, { monthly: string; annual: string }> = {
  Comercial: { monthly: "price_comercial_monthly", annual: "price_comercial_annual" },
  Corporativo: { monthly: "price_corporativo_monthly", annual: "price_corporativo_annual" },
};

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { action, plan, billing_cycle } = body;
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id || profile.role_name !== "Agency_Admin") {
    return new Response(JSON.stringify({ error: "Solo administradores" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-04-30.basil" });
  const origin = req.headers.get("origin") || "http://localhost:5173";

  if (action === "create") {
    const { data: tenant } = await supabase
      .from("agencies_tenants")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .single();

    let customerId = (tenant as unknown as { stripe_customer_id?: string })?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: tenant?.business_name });
      customerId = customer.id;
      await supabase.from("agencies_tenants").update({ stripe_customer_id: customerId }).eq("tenant_id", profile.tenant_id);
    }

    const priceKey = PLAN_PRICES[plan]?.[billing_cycle || "monthly"];
    if (!priceKey) {
      return new Response(JSON.stringify({ error: "Plan o ciclo invalido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceKey, quantity: 1 }],
      success_url: `${origin}/agency/settings?subscription=success`,
      cancel_url: `${origin}/agency/settings?subscription=cancelled`,
      metadata: { tenant_id: profile.tenant_id, plan, billing_cycle: billing_cycle || "monthly" },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "portal") {
    const { data: tenant } = await supabase
      .from("agencies_tenants")
      .select("stripe_customer_id")
      .eq("tenant_id", profile.tenant_id)
      .single();

    const customerId = (tenant as unknown as { stripe_customer_id?: string })?.stripe_customer_id;
    if (!customerId) {
      return new Response(JSON.stringify({ error: "Sin suscripcion activa" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/agency/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Accion no valida" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
