import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <img src="/avimo-logo.png" alt="Avimo" className="h-10 w-auto" />
            <p className="mt-2 text-sm text-text-muted">
              La Plataforma de las Agencias de Viaje. Conecta directamente con
              agencias y descubre paquetes turísticos exclusivos.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text">Explorar</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><Link to="/" className="hover:text-primary transition-colors">Paquetes</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Destinos</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Ofertas</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text">Agencias</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><Link to="/auth/agency" className="hover:text-primary transition-colors">Registra tu agencia</Link></li>
              <li><Link to="/agency/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text">Legal</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              {/* TODO(F7-legal): crear páginas de Términos, Privacidad y Contacto */}
              <li><Link to="/" className="hover:text-primary transition-colors">Términos y Condiciones</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Aviso de Privacidad</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Contacto</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-text-muted">
          © {new Date().getFullYear()} Avimo — Viajes para todo tu mundo. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
