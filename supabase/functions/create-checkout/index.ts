import { corsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
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

  // Parsear body
  let body: {
    package_id: string;
    currency?: string;
  };
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
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createServiceClient();

  // Obtener el paquete y datos del tenant
  const { data: pkg, error: pkgError } = await supabase
    .from("travel_packages")
    .select(
      `
      title,
      price,
      currency,
      tenant_id,
      agencies_tenants!inner(stripe_account_id)
    `,
    )
    .eq("package_id", body.package_id)
    .eq("publication_status", "published")
    .single();

  if (pkgError || !pkg) {
    return new Response(
      JSON.stringify({ error: "Paquete no encontrado o no disponible" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // @ts-ignore: nested join result
  const stripeAccountId = pkg.agencies_tenants?.stripe_account_id;
  if (!stripeAccountId) {
    return new Response(
      JSON.stringify({ error: "La agencia no tiene cuenta Stripe configurada" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const currency = body.currency || pkg.currency || "MXN";

  // Calcular anticipo: minimo 20% del precio total
  const depositAmount = Math.round(pkg.price * 0.2 * 100) / 100;
  const platformFee = Math.round(depositAmount * 0.03 * 100) / 100;
  const targetAmount = Math.round(
    ((depositAmount - platformFee) * 100),
  ) / 100;

  // NOTA: La integracion real de Stripe esta pendiente de API keys.
  // Estructura lista para activar cuando se tengan las keys.
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeSecretKey || stripeSecretKey === "sk_placeholder") {
    // Retornar estructura del checkout sin ejecutar Stripe
    const mockSession = {
      id: "cs_mock_" + crypto.randomUUID(),
      url: "https://checkout.stripe.com/pay/mock_session",
      amount_total: depositAmount,
      currency: currency,
      platform_fee: platformFee,
      target_amount: targetAmount,
      package_id: pkg.package_id,
      tenant_id: pkg.tenant_id,
      stripe_account_id: stripeAccountId,
      note: "Stripe keys no configuradas. Checkout simulado.",
    };

    return new Response(JSON.stringify(mockSession), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Codigo real de Stripe (activar con API keys validas) ---
  /*
  const Stripe = await import("npm:stripe");
  const stripe = new Stripe.default(stripeSecretKey, {
    apiVersion: "2025-06-16.acacia",
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: pkg.title,
            description: `Anticipo del 20% para el paquete turistico`,
          },
          unit_amount: Math.round(depositAmount * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
    payment_intent_data: {
      application_fee_amount: Math.round(platformFee * 100),
      transfer_data: {
        destination: stripeAccountId,
        amount: Math.round(targetAmount * 100),
      },
    },
  });

  return new Response(JSON.stringify({
    id: session.id,
    url: session.url,
    amount_total: depositAmount,
    currency: currency,
    platform_fee: platformFee,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  */
});
