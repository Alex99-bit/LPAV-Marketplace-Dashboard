import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";

// Precios reales de Stripe (test). Sobrescribibles por entorno para producción.
const PLAN_PRICES: Record<string, { monthly: string; annual: string }> = {
  Intermedio: {
    monthly: Deno.env.get("STRIPE_PRICE_INTERMEDIO_MONTHLY") || "price_1U1htg0Fcaofr3eiDSlvaSgj",
    annual: Deno.env.get("STRIPE_PRICE_INTERMEDIO_ANNUAL") || "price_1U1htg0Fcaofr3ei3XqqLPIP",
  },
  Premium: {
    monthly: Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") || "price_1U1huB0Fcaofr3eid0ynTayJ",
    annual: Deno.env.get("STRIPE_PRICE_PREMIUM_ANNUAL") || "price_1U1hvx0Fcaofr3eihlvRrRAR",
  },
};

const COMMISSION_RATES: Record<string, number> = {
  Básico: 20.00,
  Intermedio: 18.00,
  Premium: 15.00,
  Fundador: 7.50,
};

const TRIAL_PERIOD_DAYS = 30;

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

  const stripe = getStripeClient();
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
      .select("plan_type, stripe_customer_id, trial_used_at")
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Agencia no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Básico: sin cobro, cambio inmediato.
    // Fundador: solo asignable por SuperAdmin. Bloquear auto-upgrade.
    if (plan === "Básico") {
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

    if (plan === "Fundador") {
      return new Response(JSON.stringify({ error: "El Plan Fundador solo es asignable por el SuperAdmin. Solicítalo durante el registro o contacta a soporte." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Trial de 30 días: disponible una sola vez por tenant (Intermedio o Premium).
    const trialUsed = !!(tenant as unknown as { trial_used_at?: string | null }).trial_used_at;
    const offerTrial = !trialUsed && (plan === "Intermedio" || plan === "Premium");

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceKey, quantity: 1 }],
      subscription_data: {
        ...(offerTrial ? { trial_period_days: TRIAL_PERIOD_DAYS } : {}),
        metadata: {
          tenant_id: profile.tenant_id,
          plan,
          ...(offerTrial ? { trial_offered: "true" } : {}),
        },
      },
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
