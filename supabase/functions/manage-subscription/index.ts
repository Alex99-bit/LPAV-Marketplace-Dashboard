import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

const PLAN_PRICES: Record<string, { monthly: string; annual: string }> = {
  Intermedio: { monthly: "price_intermedio_monthly", annual: "price_intermedio_annual" },
  Premium: { monthly: "price_premium_monthly", annual: "price_premium_annual" },
};

const COMMISSION_RATES: Record<string, number> = {
  Básico: 20.00,
  Intermedio: 18.00,
  Premium: 15.00,
  Fundador: 7.50,
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

  let body: { action: string; plan?: string; billing_cycle?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body invalido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  if (body.action === "change_plan") {
    const plan = body.plan;
    if (!plan || !COMMISSION_RATES[plan]) {
      return new Response(JSON.stringify({ error: "Plan invalido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant } = await supabase
      .from("agencies_tenants")
      .select("plan_type, stripe_customer_id")
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Agencia no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Básico y Fundador: sin cobro, cambio inmediato
    if (plan === "Básico" || plan === "Fundador") {
      if (plan === "Fundador") {
        const { count } = await supabase
          .from("agencies_tenants")
          .select("*", { count: "exact", head: true })
          .eq("plan_type", "Fundador")
          .eq("verification_status", "verified");

        if ((count ?? 0) >= 10) {
          return new Response(JSON.stringify({ error: "Plan Fundador agotado (10 plazas)" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error: updateError } = await supabase
        .from("agencies_tenants")
        .update({
          plan_type: plan,
          commission_rate: COMMISSION_RATES[plan],
          preferential_rate_active: false,
        })
        .eq("tenant_id", profile.tenant_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, plan_type: plan, commission_rate: COMMISSION_RATES[plan] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Intermedio y Premium: requieren Stripe Checkout para suscripción
    const priceKey = PLAN_PRICES[plan]?.[body.billing_cycle || "monthly"];
    if (!priceKey) {
      return new Response(JSON.stringify({ error: "Plan o ciclo invalido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerId = (tenant as unknown as { stripe_customer_id?: string }).stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: "" });
      customerId = customer.id;
      await supabase.from("agencies_tenants").update({ stripe_customer_id: customerId }).eq("tenant_id", profile.tenant_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceKey, quantity: 1 }],
      success_url: `${origin}/agency/settings?subscription=success`,
      cancel_url: `${origin}/agency/settings?subscription=cancelled`,
      metadata: { tenant_id: profile.tenant_id, plan, billing_cycle: body.billing_cycle || "monthly" },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "portal") {
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
