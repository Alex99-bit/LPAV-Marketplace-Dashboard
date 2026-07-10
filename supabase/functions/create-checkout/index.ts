import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { package_id: string; currency?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.package_id) {
    return new Response(
      JSON.stringify({ error: "package_id es requerido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createServiceClient();

  const { data: pkg } = await supabase
    .from("travel_packages")
    .select("title, price, currency, tenant_id, agencies_tenants(stripe_account_id)")
    .eq("package_id", body.package_id)
    .eq("publication_status", "published")
    .single();

  if (!pkg) {
    return new Response(
      JSON.stringify({ error: "Paquete no encontrado o no disponible" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const stripeAccountId = (pkg.agencies_tenants as unknown as { stripe_account_id?: string })?.stripe_account_id;
  if (!stripeAccountId) {
    return new Response(
      JSON.stringify({ error: "Agencia sin cuenta Stripe configurada" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const currency = body.currency || pkg.currency || "MXN";
  const depositAmount = Math.round(pkg.price * 0.2 * 100) / 100;
  const platformFee = Math.round(depositAmount * 0.03 * 100) / 100;
  const targetAmount = Math.round((depositAmount - platformFee) * 100) / 100;

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey || stripeSecretKey === "sk_placeholder") {
    return new Response(
      JSON.stringify({
        id: "cs_mock_" + crypto.randomUUID(),
        url: "https://checkout.stripe.com/pay/mock_session",
        amount_total: depositAmount,
        currency,
        platform_fee: platformFee,
        target_amount: targetAmount,
        package_id: pkg.package_id,
        tenant_id: pkg.tenant_id,
        stripe_account_id: stripeAccountId,
        note: "Stripe keys no configuradas. Checkout simulado.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ error: "Integracion Stripe pendiente" }),
    { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
