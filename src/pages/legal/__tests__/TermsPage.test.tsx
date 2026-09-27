import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TermsPage from '../TermsPage';

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('TermsPage', () => {
  it('renders the page title', () => {
    render(<TermsPage />);
    expect(screen.getByText('Términos y Condiciones de Uso')).toBeInTheDocument();
  });

  it('renders the last updated date', () => {
    render(<TermsPage />);
    expect(screen.getByText(/Última actualización: 24 de septiembre de 2026/)).toBeInTheDocument();
  });

  it('renders all 16 sections', () => {
    render(<TermsPage />);
    expect(screen.getByText('1. Partes y Aceptación')).toBeInTheDocument();
    expect(screen.getByText('2. Objeto')).toBeInTheDocument();
    expect(screen.getByText('3. Elegibilidad y Registro')).toBeInTheDocument();
    expect(screen.getByText('4. Compras, Pagos y Depósitos')).toBeInTheDocument();
    expect(screen.getByText('5. Política de Reembolsos y Cancelaciones')).toBeInTheDocument();
    expect(screen.getByText('6. Itinerarios Generados por Inteligencia Artificial')).toBeInTheDocument();
    expect(screen.getByText('7. Sistema de Chat y Censura')).toBeInTheDocument();
    expect(screen.getByText('8. Obligaciones del Viajero')).toBeInTheDocument();
    expect(screen.getByText('9. Propiedad Intelectual')).toBeInTheDocument();
    expect(screen.getByText('10. Limitación de Responsabilidad')).toBeInTheDocument();
    expect(screen.getByText('11. Protección de Datos Personales y Telemetría')).toBeInTheDocument();
    expect(screen.getByText('12. Modificaciones a la Plataforma y los Términos')).toBeInTheDocument();
    expect(screen.getByText('13. Suspensión y Terminación')).toBeInTheDocument();
    expect(screen.getByText('14. Ley Aplicable y Resolución de Disputas')).toBeInTheDocument();
    expect(screen.getByText('15. Disposiciones Generales')).toBeInTheDocument();
    expect(screen.getByText('16. Contacto')).toBeInTheDocument();
  });

  it('contains links to privacy and cookie policies', () => {
    render(<TermsPage />);
    const privacyLinks = screen.getAllByText('Política de Privacidad');
    expect(privacyLinks.length).toBeGreaterThan(0);
    const cookieLinks = screen.getAllByText('Política de Cookies');
    expect(cookieLinks.length).toBeGreaterThan(0);
  });

  it('includes multi-jurisdiction legal references', () => {
    render(<TermsPage />);
    expect(screen.getByText(/15.1 Usuarios en México/)).toBeInTheDocument();
    expect(screen.getByText(/15.2 Usuarios en Estados Unidos/)).toBeInTheDocument();
    expect(screen.getByText(/15.3 Usuarios en Canadá/)).toBeInTheDocument();
    expect(screen.getByText(/15.4 Usuarios en Latinoamérica/)).toBeInTheDocument();
  });

  it('mentions PROFECO for Mexican consumer complaints', () => {
    render(<TermsPage />);
    expect(screen.getByText(/PROFECO/)).toBeInTheDocument();
  });

  it('mentions CCPA and arbitration for US users', () => {
    render(<TermsPage />);
    expect(screen.getAllByText(/CCPA/).length).toBeGreaterThan(0);
    expect(screen.getByText(/American Arbitration Association/)).toBeInTheDocument();
  });

  it('mentions Quebec Law 25 for Canadian users', () => {
    render(<TermsPage />);
    expect(screen.getAllByText(/Ley 25/).length).toBeGreaterThan(0);
  });

  it('includes contact email', () => {
    render(<TermsPage />);
    expect(screen.getByText(/legal@avimo\.travel/)).toBeInTheDocument();
  });

  it('contains legal disclaimer at the bottom', () => {
    render(<TermsPage />);
    expect(screen.getByText(/Aviso importante/)).toBeInTheDocument();
    expect(screen.getByText(/LFPDPPP 2025/)).toBeInTheDocument();
  });
});
