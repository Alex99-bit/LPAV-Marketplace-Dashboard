import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";

const IVA_RATE = 0.16;
const STRIPE_RATE = 0.036;
const STRIPE_FIXED_FEE = 3;
const DEPOSIT_PERCENT = 0.20;

function calculateProcessingFee(baseAmount: number): number {
  // The fee is charged to the traveler and is itself included in the Stripe charge.
  const grossedUp = ((baseAmount * STRIPE_RATE) + STRIPE_FIXED_FEE) * (1 + IVA_RATE)
    / (1 - STRIPE_RATE * (1 + IVA_RATE));
  return Math.ceil(grossedUp * 100) / 100;
}

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
    .select("*, agencies_tenants(stripe_account_id, business_name, plan_type, commission_rate)")
    .eq("package_id", body.package_id)
    .eq("publication_status", "published")
    .single();

  if (!pkg) {
    return new Response(JSON.stringify({ error: "Paquete no encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pkgRooms = pkg as unknown as { total_rooms: number; available_rooms: number };
  if (pkgRooms.total_rooms > 0 && pkgRooms.available_rooms <= 0) {
    return new Response(JSON.stringify({ error: "Paquete agotado" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const agency = pkg.agencies_tenants as unknown as {
    stripe_account_id: string;
    business_name: string;
    plan_type: string;
    commission_rate: number;
  };

  if (!agency?.stripe_account_id) {
    return new Response(JSON.stringify({ error: "Agencia sin Stripe" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const packageBasePrice = Number(pkg.price);
  // The initial deposit is a platform-wide rule, not an agency-configurable value.
  const depositPercent = DEPOSIT_PERCENT;
  const depositAmount = Math.round(packageBasePrice * depositPercent * 100);
  const processingFeeAmount = Math.round(calculateProcessingFee(depositAmount / 100) * 100);

  const commissionRate = agency.commission_rate / 100;
  const agencyCommission = Math.round(depositAmount * commissionRate);
  const platformFee = agencyCommission + processingFeeAmount;

  const depositBasePrice = depositAmount / 100;
  const packageSubtotal = depositBasePrice / (1 + IVA_RATE);
  const packageIVA = depositBasePrice - packageSubtotal;

  const totalCharge = depositAmount + processingFeeAmount;

  let holdId: string | null = null;
  if (pkgRooms.total_rooms > 0) {
    const { data: createdHoldId, error: holdError } = await supabase.rpc("create_inventory_hold", {
      p_package_id: body.package_id,
      p_user_id: user.id,
      p_units: 1,
      p_hold_minutes: 15,
    });
    if (holdError) {
      return new Response(JSON.stringify({ error: holdError.message || "Error reservando inventario" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    holdId = createdHoldId as string;
  }

  const stripe = getStripeClient();

  const origin = req.headers.get("origin") || "http://localhost:5173";

  let session;
  try {
    session = await stripe.checkout.sessions.create({
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
           package_total: String(packageBasePrice),
           deposit_amount: String(depositBasePrice),
           deposit_percent: String(depositPercent),
           agency_commission: String(agencyCommission / 100),
           payment_processing_fee: String(processingFeeAmount / 100),
           payment_processing_fee_iva: String((processingFeeAmount / 100) * IVA_RATE / (1 + IVA_RATE)),
           commission_rate: String(commissionRate),
          package_subtotal: packageSubtotal.toFixed(2),
          package_iva: packageIVA.toFixed(2),
          agency_name: agency.business_name,
          plan_type: agency.plan_type,
          ...(holdId ? { hold_id: holdId } : {}),
        },
      },
      metadata: {
        package_id: pkg.package_id,
        tenant_id: pkg.tenant_id,
        user_id: user.id,
        order_type: "deposit",
         package_total: String(packageBasePrice),
         deposit_amount: String(depositBasePrice),
         deposit_percent: String(depositPercent),
         agency_commission: String(agencyCommission / 100),
         payment_processing_fee: String(processingFeeAmount / 100),
         payment_processing_fee_iva: String((processingFeeAmount / 100) * IVA_RATE / (1 + IVA_RATE)),
        commission_rate: String(commissionRate),
        package_subtotal: packageSubtotal.toFixed(2),
        package_iva: packageIVA.toFixed(2),
        agency_name: agency.business_name,
        plan_type: agency.plan_type,
        ...(holdId ? { hold_id: holdId } : {}),
      },
    });
  } catch (err) {
    const e = err as { raw?: { code?: string; message?: string }; message?: string };
    if (e?.raw?.code === "insufficient_capabilities_for_transfer") {
      return new Response(JSON.stringify({
        error: "La agencia aún no completó su onboarding de Stripe. Completa el registro de la cuenta bancaria antes de cobrar.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      error: e?.raw?.message || e?.message || "Error creando el checkout",
    }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    id: session.id,
    url: session.url,
    amount_total: totalCharge / 100,
    currency: pkg.currency,
    platform_fee: platformFee / 100,
    agency_commission: agencyCommission / 100,
    payment_processing_fee: processingFeeAmount / 100,
    commission_rate: commissionRate,
    ...(holdId ? { hold_id: holdId } : {}),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
