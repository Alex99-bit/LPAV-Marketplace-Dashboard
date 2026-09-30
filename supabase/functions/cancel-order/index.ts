import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUser } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";

const POLICY_VERSION = "2026-09-29";
const IVA_RATE = 0.16;

type CancellationReason = "traveler_request" | "agency_cancelled" | "force_majeure";

function isWithinFiveBusinessDays(createdAt: string, now: Date): boolean {
  const start = new Date(createdAt);
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  let businessDays = 0;

  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) businessDays += 1;
  }
  return businessDays <= 5;
}

function penaltyRate(daysBeforeDeparture: number, reason: CancellationReason, createdAt: string, now: Date): number {
  if (reason !== "traveler_request") return 0;
  if (isWithinFiveBusinessDays(createdAt, now)) return 0;
  if (daysBeforeDeparture >= 60) return 0;
  if (daysBeforeDeparture >= 30) return 0.25;
  if (daysBeforeDeparture >= 15) return 0.50;
  return 1;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  let body: { order_id?: string; reason?: CancellationReason };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.order_id || !body.reason || !["traveler_request", "agency_cancelled", "force_majeure"].includes(body.reason)) {
    return new Response(JSON.stringify({ error: "order_id y reason son requeridos" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase.from("profiles").select("tenant_id, role_name").eq("id", user.id).single();
  const { data: order, error: orderError } = await supabase
    .from("transactions_orders")
    .select("*, travel_packages(departure_date)")
    .eq("order_id", body.order_id)
    .single();

  if (orderError || !order) return new Response(JSON.stringify({ error: "Orden no encontrada" }), {
    status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const agencyRole = profile?.tenant_id === order.tenant_id && ["Agency_Admin", "Agency_Collaborator", "Agency_Agent"].includes(profile.role_name);
  const traveler = order.user_id === user.id;
  if (!traveler && !agencyRole) return new Response(JSON.stringify({ error: "Sin permisos para cancelar esta orden" }), {
    status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (body.reason === "traveler_request" && !traveler) return new Response(JSON.stringify({ error: "Solo el viajero puede solicitar esta cancelación" }), {
    status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (body.reason !== "traveler_request" && !agencyRole) return new Response(JSON.stringify({ error: "La agencia debe autorizar esta cancelación" }), {
    status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (["cancelled", "refunded", "partially_refunded"].includes(order.payment_status) || order.cancellation_status === "processed") {
    return new Response(JSON.stringify({ error: "La orden ya fue cancelada o reembolsada" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const departureDate = new Date((order.travel_packages as { departure_date: string } | null)?.departure_date || now.toISOString());
  const daysBeforeDeparture = Math.ceil((departureDate.getTime() - now.getTime()) / 86400000);
  if (daysBeforeDeparture < 0 && body.reason === "traveler_request") {
    return new Response(JSON.stringify({ error: "El viaje ya inició; no procede la cancelación voluntaria" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const paidAmount = Number(order.paid_amount || order.total_amount || 0);
  const fee = Number(order.payment_processing_fee || 0);
  const rate = penaltyRate(daysBeforeDeparture, body.reason, order.created_at, now);
  const penalty = Number((paidAmount * rate + (body.reason === "traveler_request" && rate > 0 ? fee : 0)).toFixed(2));
  const refundAmount = Number(Math.max(0, body.reason === "traveler_request" ? paidAmount - penalty : paidAmount + fee).toFixed(2));
  const agencyDebit = Number((body.reason === "traveler_request" ? penalty : paidAmount + fee).toFixed(2));

  const { data: cancellation, error: cancellationError } = await supabase.from("order_cancellation_requests").insert({
    order_id: order.order_id,
    requested_by: user.id,
    reason: body.reason,
    days_before_departure: daysBeforeDeparture,
    policy_version: POLICY_VERSION,
    paid_amount: paidAmount,
    penalty_amount: penalty,
    refund_amount: refundAmount,
    agency_debit: agencyDebit,
  }).select().single();
  if (cancellationError || !cancellation) return new Response(JSON.stringify({ error: "La solicitud de cancelación ya existe o no pudo registrarse" }), {
    status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    const paymentIntent = session.payment_intent as string | null;
    if (!paymentIntent) throw new Error("La orden no tiene PaymentIntent");
    let refundId: string | null = null;
    if (refundAmount > 0) {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntent,
        amount: Math.round(refundAmount * 100),
        reason: "requested_by_customer",
        reverse_transfer: true,
        refund_application_fee: body.reason !== "traveler_request",
        metadata: { order_id: order.order_id, cancellation_id: cancellation.cancellation_id, reason: body.reason },
      });
      refundId = refund.id;

      await supabase.from("order_refunds").insert({
        order_id: order.order_id,
        cancellation_id: cancellation.cancellation_id,
        stripe_refund_id: refund.id,
        amount: refundAmount,
        currency: order.currency,
        reason: body.reason,
        processing_fee_refunded: body.reason === "traveler_request" ? 0 : fee,
        agency_debit: agencyDebit,
      });
    }
    await supabase.from("order_cancellation_requests").update({
      status: "processed", stripe_refund_id: refundId, processed_at: new Date().toISOString(),
    }).eq("cancellation_id", cancellation.cancellation_id);
    await supabase.from("transactions_orders").update({
      payment_status: refundAmount === 0 ? "cancelled" : refundAmount >= paidAmount ? "refunded" : "partially_refunded",
      cancellation_status: "processed",
      cancellation_reason: body.reason,
      cancellation_requested_at: new Date().toISOString(),
      cancellation_penalty: penalty,
      refund_amount: refundAmount,
      agency_debit: agencyDebit,
      remaining_balance: 0,
    }).eq("order_id", order.order_id);
    if (order.package_id) {
      await supabase.rpc("increment_available_rooms", { p_package_id: order.package_id });
    }

    return new Response(JSON.stringify({ cancellation_id: cancellation.cancellation_id, refund_id: refundId, refund_amount: refundAmount, penalty_amount: penalty }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    await supabase.from("order_cancellation_requests").update({ status: "failed" }).eq("cancellation_id", cancellation.cancellation_id);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "No se pudo procesar el reembolso" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
