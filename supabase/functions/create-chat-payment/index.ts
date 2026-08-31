import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";
import { getStripeClient } from "../_shared/stripe/client.ts";

const IVA_RATE = 0.16;

const ALLOWED_REDIRECT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://lpav.mx",
  "https://www.lpav.mx",
];

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { conversation_id: string; amount: number; currency?: string; concept: string; order_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.conversation_id || !body.amount || !body.concept) {
    return new Response(JSON.stringify({ error: "conversation_id, amount y concept son requeridos" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.amount <= 0) {
    return new Response(JSON.stringify({ error: "El monto debe ser mayor a 0" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role_name, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return new Response(JSON.stringify({ error: "Solo agencias pueden solicitar pagos" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verificar que el usuario tiene rol de agencia
  const agencyRoles = ["Agency_Admin", "Agency_Agent", "Agency_Collaborator"];
  if (!profile.role_name || !agencyRoles.includes(profile.role_name)) {
    return new Response(JSON.stringify({ error: "Solo usuarios de agencia pueden solicitar pagos" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("stripe_account_id, business_name, plan_type, commission_rate")
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!tenant?.stripe_account_id) {
    return new Response(JSON.stringify({ error: "Configura Stripe Connect antes de solicitar pagos" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const currency = body.currency || "MXN";
  const amountCents = Math.round(body.amount * 100);

  // Validar orden existente y reglas de pago diferido
  let remainingBalance: number | null = null;
  if (body.order_id) {
    const { data: order } = await supabase
      .from("transactions_orders")
      .select("remaining_balance, total_amount, next_payment_due, payment_status, created_at")
      .eq("order_id", body.order_id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Orden no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.payment_status === "paid" || order.payment_status === "cancelled") {
      return new Response(JSON.stringify({ error: "Esta orden ya está pagada o cancelada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    remainingBalance = order.remaining_balance;

    if (body.amount > remainingBalance) {
      return new Response(JSON.stringify({ error: `El monto excede el saldo pendiente de ${remainingBalance.toFixed(2)} ${currency}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar plazo máximo de 4 meses
    if (order.next_payment_due) {
      const dueDate = new Date(order.next_payment_due);
      const orderCreated = new Date(order.created_at || dueDate);
      const maxDate = new Date(orderCreated);
      maxDate.setMonth(maxDate.getMonth() + 4);
      if (new Date() > maxDate) {
        return new Response(JSON.stringify({ error: "El plazo máximo de 4 meses para pagos diferidos ha vencido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  // Calcular comision de la agencia
  const commissionRate = tenant.commission_rate / 100;
  const agencyCommission = parseFloat((body.amount * commissionRate).toFixed(2));
  const platformFee = Math.round(agencyCommission * 100);

  // Encontrar al viajero en la conversacion
  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", body.conversation_id);

  const participantIds = (participants ?? []).map((p: { user_id: string }) => p.user_id);
  const travelerId = participantIds.find((id: string) => id !== user.id);

  const stripe = getStripeClient();
  const rawOrigin = req.headers.get("origin") || "http://localhost:5173";
  const origin = ALLOWED_REDIRECT_ORIGINS.includes(rawOrigin) ? rawOrigin : ALLOWED_REDIRECT_ORIGINS[0];

  // Idempotency: check for recent payment_request with same conversation + amount
  const { data: recentMsg } = await supabase
    .from("chat_messages")
    .select("message_id")
    .eq("conversation_id", body.conversation_id)
    .eq("message_type", "payment_request")
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(1);

  if (recentMsg && recentMsg.length > 0) {
    return new Response(JSON.stringify({ error: "Ya existe una solicitud de pago reciente para esta conversación" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: body.concept,
            description: `Pago solicitado por ${tenant.business_name}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: tenant.stripe_account_id,
        },
      },
      customer_email: travelerId ? undefined : undefined,
      success_url: `${origin}/chat?conversationId=${body.conversation_id}&payment=success`,
      cancel_url: `${origin}/chat?conversationId=${body.conversation_id}&payment=cancelled`,
      metadata: {
        conversation_id: body.conversation_id,
        tenant_id: profile.tenant_id,
        traveler_id: travelerId || "",
        order_id: body.order_id || "",
        concept: body.concept,
        commission_rate: String(commissionRate),
        agency_commission: String(agencyCommission),
        chat_payment: "true",
      },
    });
  } catch (err) {
    const e = err as { message?: string; raw?: { message?: string } };
    return new Response(JSON.stringify({ error: e?.raw?.message || e?.message || "Error creando sesión de pago" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insertar mensaje payment_request en el chat
  try {
    await supabase.from("chat_messages").insert({
      conversation_id: body.conversation_id,
      sender_id: user.id,
      message_text: JSON.stringify({
        amount: body.amount,
        currency,
        concept: body.concept,
        stripe_session_id: session.id,
        remaining_balance: remainingBalance,
        commission_applied: agencyCommission,
        commission_rate: tenant.commission_rate,
      }),
      message_type: "payment_request",
      metadata: {
        amount: body.amount,
        currency,
        concept: body.concept,
        stripe_session_id: session.id,
        stripe_session_url: session.url || "",
        order_id: body.order_id || null,
      },
    });
  } catch (err) {
    console.error("Failed to insert chat message:", err);
  }

  return new Response(JSON.stringify({
    url: session.url,
    stripe_session_id: session.id,
    amount: body.amount,
    currency,
    commission_applied: agencyCommission,
    commission_rate: tenant.commission_rate,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
