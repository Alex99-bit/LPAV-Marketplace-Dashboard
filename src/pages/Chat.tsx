import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, AlertTriangle } from "lucide-react";
import type { ChatMessage } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatRelativeTime } from "@/lib/formatters";
import Spinner from "@/components/ui/Spinner";

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [censorWarning, setCensorWarning] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationId = "demo-conversation";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages(data ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    setCensorWarning("");

    const messageText = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_text: messageText,
    });

    if (error) {
      if (error.code === "CK001") {
        setCensorWarning(
          "Tu mensaje fue bloqueado por contener datos de contacto. El uso de números de teléfono, correos o intentos de evasión están prohibidos.",
        );
      } else {
        setNewMessage(messageText);
      }
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col px-4 sm:px-6">
      <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-text">Chat</h1>
          <p className="text-xs text-text-muted">
            Comunícate directamente con la agencia
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          return (
            <div
              key={msg.message_id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isOwn
                    ? "bg-primary text-white"
                    : "bg-surface text-text"
                }`}
              >
                <p className="text-sm">{msg.message_text}</p>
                <p
                  className={`mt-1 text-right text-[10px] ${
                    isOwn ? "text-white/70" : "text-text-muted"
                  }`}
                >
                  {formatRelativeTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {censorWarning && (
        <div className="mb-2 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{censorWarning}</p>
        </div>
      )}

      <div className="flex gap-2 border-t border-gray-100 pt-4">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
