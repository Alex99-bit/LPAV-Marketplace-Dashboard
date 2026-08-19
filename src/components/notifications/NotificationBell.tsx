import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, MessageSquare, CreditCard, AlertTriangle, CheckCircle, XCircle, Ban } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { formatRelativeTime } from "@/lib/formatters";
import Dropdown, { DropdownItem } from "@/components/ui/Dropdown";
import type { Notification as NotificationType } from "@/types";

// TODO(F1-icon-consolidation): ICON_MAP duplicado con RecentActivity.
// Extraer a tabla compartida cuando se unifique el sistema de notificaciones.
const ICON_MAP = {
  new_message: MessageSquare,
  payment_received: CreditCard,
  package_reported: AlertTriangle,
  package_approved: CheckCircle,
  package_banned: XCircle,
  order_cancelled: Ban,
};

interface NotificationBellProps {
  /* Dirección en la que se abre el panel: "right" (default, para barras a la
     derecha) o "left" (para barras laterales ancladas a la izquierda). */
  align?: "left" | "right";
}

export default function NotificationBell({ align = "right" }: NotificationBellProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id!)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications(data ?? []);
      setUnreadCount(data?.filter((n) => !n.read).length ?? 0);
    };

    fetchNotifications();

    const channel = supabase
      .channel("notification-bell")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          setNotifications((prev) => [
            payload.new as NotificationType,
            ...prev.slice(0, 19),
          ]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleMarkAllRead = async () => {
    if (!profile?.id) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("notification_id", notificationId);
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, read: true } : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  /* Navega al destino asociado a la notificación. La columna `link`
     de la tabla notifications contiene la ruta relativa (ej: /chat?c=...). */
  const handleNavigate = (notif: NotificationType) => {
    handleMarkRead(notif.notification_id);
    setOpen(false);
    const link = (notif as { link?: string }).link;
    if (link) {
      navigate(link);
    }
  };

  const triggerButton = (
    <button
      onClick={() => setOpen(!open)}
      className="relative rounded-lg p-2 text-text-muted hover:bg-gray-100 transition-colors"
      aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
      aria-expanded={open}
      aria-haspopup="menu"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <Dropdown
      trigger={triggerButton}
      open={open}
      onClose={() => setOpen(false)}
      align={align}
      className="w-96"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-text">Notificaciones</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-primary hover:underline"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>
      <div>
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            No hay notificaciones.
          </p>
        ) : (
          <div className="space-y-0.5 p-1">
            {notifications.map((notif) => {
              const Icon =
                ICON_MAP[notif.type as keyof typeof ICON_MAP] ?? Bell;
              return (
                <DropdownItem
                  key={notif.notification_id}
                  onClick={() => handleNavigate(notif)}
                  icon={
                    <div className="rounded-md bg-gray-100 p-1">
                      <Icon className="h-3.5 w-3.5 text-text-muted" />
                    </div>
                  }
                >
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          !notif.read
                            ? "font-semibold text-text"
                            : "font-medium text-text"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="mt-0.5 text-xs leading-snug text-text-muted break-words">
                          {notif.message}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-text-muted">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                </DropdownItem>
              );
            })}
          </div>
        )}
      </div>
    </Dropdown>
  );
}
