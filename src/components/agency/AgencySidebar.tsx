import { NavLink } from "react-router";
import {
  LayoutDashboard, Image, Users, MessageSquare,
  DollarSign, Truck, Settings, BarChart3, Shield, LogOut, X, Sun, Moon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import NotificationBell from "@/components/notifications/NotificationBell";

// TODO(F4-responsive): rediseño completo de la sidebar con drawer, gestos
// táctiles y animaciones. Ver TODO en AgencyLayout.tsx.

const NAV_ITEMS = [
  { to: "/agency/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agency/flyers", label: "Flyers", icon: Image },
  { to: "/agency/crm", label: "CRM", icon: Users },
  { to: "/agency/chat", label: "Chat", icon: MessageSquare },
  { to: "/agency/finance", label: "Finanzas", icon: DollarSign, requirePerm: "can_manage_finance" },
  { to: "/agency/logistics", label: "Logística", icon: Truck, requirePerm: "can_manage_chat" },
  { to: "/agency/analytics", label: "Analíticas", icon: BarChart3 },
  { to: "/agency/roles", label: "Roles", icon: Shield },
  { to: "/agency/settings", label: "Configuración", icon: Settings },
];

interface AgencySidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AgencySidebar({ isMobileOpen = false, onMobileClose }: AgencySidebarProps) {
  const { profile, signOut } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();

  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-surface-raised transition-transform duration-300 dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-6 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            L
          </div>
          <span className="text-lg font-bold text-text">LPAV</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface transition-colors"
            aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <NotificationBell align="left" />
          <button
            onClick={onMobileClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface lg:hidden"
            aria-label="Cerrar menú lateral"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-gray-50 hover:text-text dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-text">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">
              {profile?.full_name ?? "Agencia"}
            </p>
            <p className="text-xs text-text-muted truncate">{profile?.email}</p>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="rounded-lg p-1.5 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
