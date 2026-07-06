import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabase = createServiceClient();

  if (!stripeWebhookSecret || stripeWebhookSecret === "whsec_placeholder") {
    let event: { type: string; data: { object: Record<string, unknown> } };
    try {
      event = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ received: true, mode: "mock", event: event.type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ received: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
