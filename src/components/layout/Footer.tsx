export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <span className="text-xl font-bold text-primary">LPAV</span>
            <p className="mt-2 text-sm text-text-muted">
              La Plataforma de las Agencias de Viaje. Conecta directamente con
              agencias y descubre paquetes turísticos exclusivos.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text">Explorar</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="/" className="hover:text-primary transition-colors">Paquetes</a></li>
              <li><a href="/" className="hover:text-primary transition-colors">Destinos</a></li>
              <li><a href="/" className="hover:text-primary transition-colors">Ofertas</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text">Agencias</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="/agency/register" className="hover:text-primary transition-colors">Registra tu agencia</a></li>
              <li><a href="/agency/dashboard" className="hover:text-primary transition-colors">Dashboard</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text">Legal</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="#" className="hover:text-primary transition-colors">Términos y Condiciones</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Aviso de Privacidad</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-text-muted">
          © {new Date().getFullYear()} LPAV — La Plataforma de las Agencias de Viaje. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
