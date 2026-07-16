import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json();
  const { user_id, type, title, message, metadata } = body;
  const supabase = createServiceClient();

  const { data: notification } = await supabase
    .from("notifications")
    .insert({ user_id, type, title, message, metadata })
    .select()
    .single();

  if (!notification) {
    return new Response(JSON.stringify({ error: "Error creando notificacion" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user_id)
    .single();

  const channels: string[] = [];

  if (prefs?.push_enabled) {
    channels.push("push");
  }

  if (prefs?.email_enabled) {
    const shouldEmail = (
      (type === "payment_received" && prefs.email_payment_reminders) ||
      (type === "new_message" && prefs.email_chat_notifications) ||
      ["package_reported", "package_approved", "package_banned", "order_cancelled"].includes(type)
    );
    if (shouldEmail) channels.push("email");
  }

  for (const channel of channels) {
    await supabase.from("notification_delivery_log").insert({
      notification_id: notification.notification_id,
      user_id,
      channel,
      status: "queued",
    });
  }

  if (channels.includes("email")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user_id)
      .single();

    if (profile?.email) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: profile.email,
          subject: title,
          html: `<h2>${title}</h2><p>${message || ""}</p>`,
        }),
      });
    }
  }

  return new Response(JSON.stringify({ notification_id: notification.notification_id, channels }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
