import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ShoppingCart, User, LogOut, LayoutDashboard, Building2, Package, MessageCircle, Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import Button from "@/components/ui/Button";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, signOut, isAgency } = useAuth();
  const { itemCount } = useCart();
  const { dark, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? "border-gray-200 bg-white/95 backdrop-blur-xl shadow-sm dark:border-gray-800 dark:bg-gray-900/95"
          : "border-white/20 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/80"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary dark:text-primary-light">LPAV</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
          >
            Explorar
          </Link>
          {!user && (
            <Link
              to="/auth/agency"
              className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              <Building2 className="h-4 w-4" />
              Soy Agencia
            </Link>
          )}
          {user && !isAgency && (
            <>
              <Link
                to="/orders"
                className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
              >
                <Package className="h-4 w-4" />
                Mis Órdenes
              </Link>
              <Link
                to="/chat"
                className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </Link>
            </>
          )}
          {isAgency && (
            <>
              <Link
                to="/agency/dashboard"
                className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
              >
                Dashboard
              </Link>
              <Link
                to="/agency/crm"
                className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
              >
                CRM
              </Link>
            </>
          )}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text transition-colors"
            aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link to="/checkout" className="relative rounded-lg p-2 text-text-muted hover:bg-surface hover:text-primary transition-colors" aria-label={`Carrito (${itemCount} artículo${itemCount !== 1 ? "s" : ""})`}>
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              {isAgency && (
                <Link to="/agency/dashboard" className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-primary transition-colors">
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
              )}
              <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {profile?.full_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="max-w-[120px] truncate text-sm font-medium text-text">
                  {profile?.full_name ?? user.email}
                </span>
              </div>
              <button
                onClick={signOut}
                className="rounded-lg p-2 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth/login">
                <Button size="sm">
                  <User className="h-4 w-4" />
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-2 text-text hover:bg-surface md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <span className="relative block h-5 w-5">
            <span
              className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ${
                menuOpen ? "rotate-45 top-2" : "top-0"
              }`}
            />
            <span
              className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ${
                menuOpen ? "opacity-0" : "top-2"
              }`}
            />
            <span
              className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ${
                menuOpen ? "-rotate-45 top-2" : "top-4"
              }`}
            />
          </span>
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3">
            <Link to="/" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
              Explorar
            </Link>
            {!user && (
              <Link to="/auth/agency" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
                <Building2 className="h-4 w-4" />
                Soy Agencia
              </Link>
            )}
            <Link to="/checkout" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
              Carrito ({itemCount})
            </Link>
            {user && !isAgency && (
              <>
                <Link to="/orders" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
                  Mis Órdenes
                </Link>
                <Link to="/chat" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
                  Chat
                </Link>
              </>
            )}
            {isAgency && (
              <>
                <Link to="/agency/dashboard" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
                  Dashboard
                </Link>
                <Link to="/agency/crm" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
                  CRM
                </Link>
              </>
            )}
            {user ? (
              <>
                <div className="border-t border-gray-100 pt-3">
                  <p className="px-3 text-xs text-text-muted">{user.email}</p>
                </div>
                <button onClick={() => { toggleTheme(); setMenuOpen(false); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-text hover:bg-surface">
                  {dark ? "☀️ Modo claro" : "🌙 Modo oscuro"}
                </button>
                <button onClick={() => { signOut(); setMenuOpen(false); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 hover:bg-red-50">
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <Link to="/auth/login" onClick={() => setMenuOpen(false)}>
                <Button className="w-full">Iniciar Sesión</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
