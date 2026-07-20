import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router";
import { MessageSquare, Send, AlertTriangle, Hand, Bot, ToggleLeft, ToggleRight } from "lucide-react";
import type { ChatMessage } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/formatters";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";

export default function Chat() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [censorWarning, setCensorWarning] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isAgencyChat, setIsAgencyChat] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const navState = location.state as { conversationId?: string; leadId?: string } | null;

  useEffect(() => {
    if (navState?.conversationId) {
      setConversationId(navState.conversationId);
      setLeadId(navState.leadId ?? null);
    }
  }, [navState]);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50);
      // Filtra mensajes de sistema: el viajero no debe ver jerga CRM interna
      // ([SYSTEM] Nuevo lead creado…). El handler realtime ya los filtra (:72).
      const userMessages = (data ?? []).filter(
        (m) => !m.message_text.startsWith("[SYSTEM]"),
      );
      setMessages(userMessages);
      setLoading(false);
    };

    fetchMessages();

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
          const msg = payload.new as ChatMessage;
          if (!msg.message_text.startsWith("[SYSTEM]")) {
            setMessages((prev) => {
              if (prev.some((m) => m.message_id === msg.message_id)) return prev;
              return [...prev, msg];
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role_name")
        .eq("id", user.id)
        .single();
      setIsAgencyChat(
        profile?.role_name === "Agency_Admin" ||
          profile?.role_name === "Agency_Agent" ||
          profile?.role_name === "Agency_Collaborator",
      );
      setIsAdmin(profile?.role_name === "Agency_Admin");
    })();
  }, [user]);

  useEffect(() => {
    if (!leadId || !conversationId) return;
    (async () => {
      const { data: session } = await supabase
        .from("crm_ai_qualification_sessions")
        .select("status")
        .eq("lead_id", leadId)
        .eq("status", "active")
        .maybeSingle();
      setAiActive(session !== null && session !== undefined);
    })();
  }, [leadId, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const invokeAIQualification = async (messageText: string) => {
    if (!leadId || !conversationId || !user) return;

    setAiProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-qualify-lead`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lead_id: leadId,
            conversation_id: conversationId,
            latest_message: messageText,
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        if (data.qualification_completed || data.should_transfer_to_human) {
          setAiActive(false);
        }
      } else {
        console.error("AI qualification failed:", await res.text());
      }
    } catch (err) {
      console.error("AI qualification error:", err);
    } finally {
      setAiProcessing(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    if (!conversationId) {
      addToast("warning", "No hay conversación activa", "Solicita información en un paquete para iniciar un chat.");
      return;
    }
    
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
          "Tu mensaje fue bloqueado por contener datos de contacto. El uso de numeros de telefono, correos o intentos de evasion estan prohibidos.",
        );
      } else {
        setNewMessage(messageText);
      }
    } else if (leadId && aiActive) {
      await invokeAIQualification(messageText);
    }

    setSending(false);
  };

  const handleTakeControl = async () => {
    if (!leadId || !conversationId || !user) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transfer-lead-to-human`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lead_id: leadId, conversation_id: conversationId }),
      },
    );

    setAiActive(false);
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
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-text">Chat</h1>
            <p className="text-xs text-text-muted">
              {isAgencyChat
                ? "Comunícate con el viajero"
                : "Comunícate directamente con la agencia"}
            </p>
          </div>
        </div>
        {isAgencyChat && aiActive && (
          <Button variant="outline" size="sm" onClick={handleTakeControl}>
            <Hand className="h-3.5 w-3.5" />
            Tomar control
          </Button>
        )}
        {isAdmin && (
          <button
            onClick={() => {
              if (aiActive) {
                handleTakeControl();
              } else {
                setAiActive(true);
              }
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-gray-100 transition-colors"
          >
            {aiActive ? (
              <ToggleRight className="h-5 w-5 text-primary" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
            AI Agent
          </button>
        )}
      </div>

      {aiActive && isAgencyChat && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <Bot className="h-3.5 w-3.5" />
          <span>Asistente de IA activo — cualificando lead</span>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
  if (!conversationId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <MessageSquare className="h-16 w-16 text-text-muted/30" />
        <h2 className="text-xl font-semibold text-text">Sin conversación activa</h2>
        <p className="max-w-sm text-sm text-text-muted">
          Explora paquetes y usa <strong>"Solicitar información"</strong> para
          iniciar un chat con la agencia de viajes.
        </p>
      </div>
    );
  }

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
        {aiProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl bg-surface px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-text-muted">escribiendo...</span>
              </div>
            </div>
          </div>
        )}
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
          disabled={sending || aiProcessing}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending || aiProcessing}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
