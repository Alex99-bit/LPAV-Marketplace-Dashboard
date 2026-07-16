import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { package_id: string; deposit_percent?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.package_id) {
    return new Response(JSON.stringify({ error: "package_id es requerido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  const { data: pkg } = await supabase
    .from("travel_packages")
    .select("*, agencies_tenants(stripe_account_id, business_name)")
    .eq("package_id", body.package_id)
    .eq("publication_status", "published")
    .single();

  if (!pkg) {
    return new Response(JSON.stringify({ error: "Paquete no encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const agency = pkg.agencies_tenants as unknown as { stripe_account_id: string; business_name: string };
  if (!agency?.stripe_account_id) {
    return new Response(JSON.stringify({ error: "Agencia sin Stripe" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-04-30.basil" });

  const depositPercent = body.deposit_percent ?? Number((pkg as unknown as { deposit_percent?: number }).deposit_percent) ?? 0.2;
  const depositAmount = Math.round(pkg.price * depositPercent * 100);
  const platformFee = Math.round(depositAmount * 0.03);

  const origin = req.headers.get("origin") || "http://localhost:5173";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: (pkg.currency || "mxn").toLowerCase(),
        product_data: { name: `Anticipo: ${pkg.title}` },
        unit_amount: depositAmount,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${origin}/orders?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout`,
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: { destination: agency.stripe_account_id },
      metadata: {
        package_id: pkg.package_id,
        tenant_id: pkg.tenant_id,
        user_id: user.id,
        order_type: "deposit",
      },
    },
    metadata: {
      package_id: pkg.package_id,
      tenant_id: pkg.tenant_id,
      user_id: user.id,
    },
  }, { stripeAccount: agency.stripe_account_id });

  return new Response(JSON.stringify({
    id: session.id,
    url: session.url,
    amount_total: depositAmount / 100,
    currency: pkg.currency,
    platform_fee: platformFee / 100,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
