import { createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (_req: Request) => {
  const supabase = createServiceClient();

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: recentMessages } = await supabase
    .from("chat_messages")
    .select("conversation_id, sender_id, created_at")
    .gte("created_at", fiveMinutesAgo);

  const activeConversations = new Set(recentMessages?.map((m) => m.conversation_id) ?? []);

  const { data: allConversations } = await supabase
    .from("chat_messages")
    .select("conversation_id, sender_id")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  const conversationAgents = new Map<string, string>();
  for (const msg of allConversations ?? []) {
    conversationAgents.set(msg.conversation_id, msg.sender_id);
  }

  let notified = 0;

  for (const convId of activeConversations) {
    const agentId = conversationAgents.get(convId);
    if (!agentId) continue;

    const { data: lastMsg } = await supabase
      .from("chat_messages")
      .select("sender_id, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!lastMsg || lastMsg.sender_id !== agentId) continue;

    const lastMsgTime = new Date(lastMsg.created_at).getTime();
    if (Date.now() - lastMsgTime < 5 * 60 * 1000) continue;

    const { data: existingReminder } = await supabase
      .from("notification_delivery_log")
      .select("log_id")
      .eq("user_id", agentId)
      .eq("channel", "offline_check")
      .gte("sent_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existingReminder && existingReminder.length > 0) continue;

    await supabase.from("notifications").insert({
      user_id: agentId,
      type: "new_message",
      title: "Chat sin responder",
      message: "Tienes conversaciones activas sin respuesta en los últimos 5 minutos.",
    });

    await supabase.from("notification_delivery_log").insert({
      user_id: agentId,
      channel: "offline_check",
      status: "sent",
    });

    notified++;
  }

  return new Response(JSON.stringify({ notified }), {
    headers: { "Content-Type": "application/json" },
  });
});
