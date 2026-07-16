import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { Notification } from "@/types";
import { MessageSquare, CreditCard, AlertTriangle, CheckCircle, XCircle, Ban } from "lucide-react";

const ICON_MAP = {
  new_message: MessageSquare,
  payment_received: CreditCard,
  package_reported: AlertTriangle,
  package_approved: CheckCircle,
  package_banned: XCircle,
  order_cancelled: Ban,
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString("es-MX");
}

export default function RecentActivity() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id!)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data ?? []);
    };

    fetchNotifications();

    const channel = supabase
      .channel("dashboard-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-text">Actividad Reciente</h2>
        <p className="mt-4 text-sm text-text-muted text-center py-8">
          No hay actividad reciente.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-semibold text-text">Actividad Reciente</h2>
      <div className="mt-4 space-y-3">
        {notifications.map((notif) => {
          const Icon = ICON_MAP[notif.type as keyof typeof ICON_MAP] ?? MessageSquare;
          return (
            <div
              key={notif.notification_id}
              className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${
                notif.read ? "bg-white" : "bg-blue-50/50"
              }`}
            >
              <div className="rounded-lg bg-gray-100 p-2">
                <Icon className="h-4 w-4 text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{notif.title}</p>
                {notif.message && (
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                )}
              </div>
              <span className="text-xs text-text-muted whitespace-nowrap">
                {formatRelativeTime(notif.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
