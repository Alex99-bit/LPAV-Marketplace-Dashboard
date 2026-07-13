import { useState } from "react";
import { Link } from "react-router";
import { Menu, X, ShoppingCart, User, LogOut, Bell, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, signOut, isAgency } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/20 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">LPAV</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
          >
            Explorar
          </Link>
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
          <Link to="/checkout" className="relative rounded-lg p-2 text-text-muted hover:bg-surface hover:text-primary transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <button className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-primary transition-colors">
                <Bell className="h-5 w-5" />
              </button>
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
            <Link to="/auth/login">
              <Button size="sm">
                <User className="h-4 w-4" />
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-2 text-text hover:bg-surface md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
              Explorar
            </Link>
            <Link to="/checkout" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface">
              Carrito ({itemCount})
            </Link>
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
