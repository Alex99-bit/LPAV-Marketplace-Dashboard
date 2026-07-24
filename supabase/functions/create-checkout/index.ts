import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

const TRAVELER_SERVICE_FEE_RATE = 0.06;
const AGENCY_EFFECTIVE_RATE = 0.0928;
const IVA_RATE = 0.16;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { package_id: string; deposit_percent?: number; points_to_redeem?: number };
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

  const packageBasePrice = pkg.price;
  const depositPercent = body.deposit_percent ?? Number((pkg as unknown as { deposit_percent?: number }).deposit_percent) ?? 0.2;
  const depositAmount = Math.round(packageBasePrice * depositPercent * 100);
  const pointsToRedeem = body.points_to_redeem ?? 0;

  if (pointsToRedeem > 0) {
    if (pointsToRedeem < 200) {
      return new Response(JSON.stringify({ error: "Minimo 200 puntos para canjear" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pointsToRedeem > packageBasePrice * 0.20) {
      return new Response(JSON.stringify({ error: "Los puntos no pueden exceder el 20% del precio total del paquete" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: wallet, error: walletError } = await supabase
      .from("user_wallets")
      .select("points_balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "No se pudo consultar tu cartera de puntos" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (wallet.points_balance < pointsToRedeem) {
      return new Response(JSON.stringify({ error: "Puntos insuficientes en tu cartera" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const serviceFee = Math.round(packageBasePrice * TRAVELER_SERVICE_FEE_RATE * 100);
  const agencyCommission = Math.round(depositAmount * AGENCY_EFFECTIVE_RATE);
  const platformFee = serviceFee + agencyCommission;

  const packageSubtotal = packageBasePrice / (1 + IVA_RATE);
  const packageIVA = packageBasePrice - packageSubtotal;
  const serviceFeeSubtotal = (serviceFee / 100) / (1 + IVA_RATE);
  const serviceFeeIVA = (serviceFee / 100) - serviceFeeSubtotal;

  const pointsOffset = pointsToRedeem * 100;
  const totalCharge = Math.max(0, depositAmount + serviceFee - pointsOffset);

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-04-30.basil" });

  const origin = req.headers.get("origin") || "http://localhost:5173";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: (pkg.currency || "mxn").toLowerCase(),
        product_data: { name: pkg.title },
        unit_amount: totalCharge,
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
        points_redeemed: String(pointsToRedeem),
        package_total: String(packageBasePrice),
        traveler_service_fee: String(serviceFee / 100),
        agency_commission: String(agencyCommission / 100),
        package_subtotal: packageSubtotal.toFixed(2),
        package_iva: packageIVA.toFixed(2),
        service_fee_subtotal: serviceFeeSubtotal.toFixed(2),
        service_fee_iva: serviceFeeIVA.toFixed(2),
        agency_name: agency.business_name,
      },
    },
    metadata: {
      package_id: pkg.package_id,
      tenant_id: pkg.tenant_id,
      user_id: user.id,
      order_type: "deposit",
      points_redeemed: String(pointsToRedeem),
      package_total: String(packageBasePrice),
      traveler_service_fee: String(serviceFee / 100),
      agency_commission: String(agencyCommission / 100),
      package_subtotal: packageSubtotal.toFixed(2),
      package_iva: packageIVA.toFixed(2),
      service_fee_subtotal: serviceFeeSubtotal.toFixed(2),
      service_fee_iva: serviceFeeIVA.toFixed(2),
      agency_name: agency.business_name,
    },
  }, { stripeAccount: agency.stripe_account_id });

  return new Response(JSON.stringify({
    id: session.id,
    url: session.url,
    amount_total: totalCharge / 100,
    currency: pkg.currency,
    platform_fee: platformFee / 100,
    service_fee: serviceFee / 100,
    agency_commission: agencyCommission / 100,
    ...(pointsToRedeem > 0 ? { points_redeemed: pointsToRedeem } : {}),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
