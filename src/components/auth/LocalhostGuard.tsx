import type { ReactNode } from "react";
import { ShieldOff } from "lucide-react";

const ALLOWED_HOSTNAMES = ["localhost", "127.0.0.1", "::1"];

export default function LocalhostGuard({ children }: { children: ReactNode }) {
  const hostname = window.location.hostname;
  const isLocal = ALLOWED_HOSTNAMES.includes(hostname);

  if (!isLocal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500">
            <ShieldOff className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-text">403 — Acceso Restringido</h1>
          <p className="mt-3 text-sm text-text-muted">
            El panel de administración solo está disponible desde entornos
            locales autorizados. Esta restricción se mantendrá hasta que la
            infraestructura de seguridad corporativa esté operativa.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
