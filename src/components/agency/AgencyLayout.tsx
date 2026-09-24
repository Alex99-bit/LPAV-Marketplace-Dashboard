import { useState } from "react";
import { Outlet } from "react-router";
import { Menu } from "lucide-react";
import AgencySidebar from "./AgencySidebar";

// TODO(F4-responsive): rediseño completo del panel de agencia (drawer con
// gesto, tablas con scroll horizontal o card layouts, grids adaptativos).
// Por ahora la sidebar se oculta/despliega con hamburguesa en móvil.

export default function AgencyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-950">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <AgencySidebar
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <main className="min-h-screen lg:ml-64">
        <div className="flex h-16 items-center border-b border-gray-100 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-text hover:bg-surface"
            aria-label="Abrir menú lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-text">Avimo</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
