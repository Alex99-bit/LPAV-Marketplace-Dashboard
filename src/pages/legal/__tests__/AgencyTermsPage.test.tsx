import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgencyTermsPage from '../AgencyTermsPage';

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('AgencyTermsPage', () => {
  it('renders the page title', () => {
    render(<AgencyTermsPage />);
    expect(screen.getByText('Términos y Condiciones para Agencias de Viaje')).toBeInTheDocument();
  });

  it('renders all 18 sections', () => {
    render(<AgencyTermsPage />);
    expect(screen.getByText('1. Partes y Aceptación')).toBeInTheDocument();
    expect(screen.getByText('2. Objeto y Naturaleza de la Relación')).toBeInTheDocument();
    expect(screen.getByText('3. Registro y Verificación')).toBeInTheDocument();
    expect(screen.getByText('4. Planes SaaS y Comisiones')).toBeInTheDocument();
    expect(screen.getByText('5. Publicación de Flyers y Contenido')).toBeInTheDocument();
    expect(screen.getByText('6. Obligaciones Fiscales')).toBeInTheDocument();
    expect(screen.getByText('7. Pagos y Stripe Connect')).toBeInTheDocument();
    expect(screen.getByText('8. Política de No Reembolsos')).toBeInTheDocument();
    expect(screen.getByText('9. Uso de Datos para Inteligencia Artificial')).toBeInTheDocument();
    expect(screen.getByText('10. Confidencialidad y NDA')).toBeInTheDocument();
    expect(screen.getByText('11. Transferencia de Datos Personales')).toBeInTheDocument();
    expect(screen.getByText('12. Censura, Strikes y Suspensión')).toBeInTheDocument();
    expect(screen.getByText('13. Propiedad Intelectual')).toBeInTheDocument();
    expect(screen.getByText('14. Limitación de Responsabilidad')).toBeInTheDocument();
    expect(screen.getByText('15. Vigencia y Terminación')).toBeInTheDocument();
    expect(screen.getByText('16. Ley Aplicable y Resolución de Disputas')).toBeInTheDocument();
    expect(screen.getByText('17. Disposiciones Generales')).toBeInTheDocument();
    expect(screen.getByText('18. Contacto')).toBeInTheDocument();
  });

  it('mentions SaaS plan types', () => {
    render(<AgencyTermsPage />);
    expect(screen.getByText(/Plan Básico/)).toBeInTheDocument();
    expect(screen.getByText(/Plan Intermedio/)).toBeInTheDocument();
    expect(screen.getByText(/Plan Premium/)).toBeInTheDocument();
    expect(screen.getByText(/Plan Fundador/)).toBeInTheDocument();
  });

  it('mentions Stripe Connect', () => {
    render(<AgencyTermsPage />);
    const stripeMentions = screen.getAllByText(/Stripe Connect/);
    expect(stripeMentions.length).toBeGreaterThan(0);
  });

  it('mentions NDA and confidentiality', () => {
    render(<AgencyTermsPage />);
    expect(screen.getByText(/Confidencialidad/)).toBeInTheDocument();
    expect(screen.getByText(/NDA/)).toBeInTheDocument();
  });

  it('mentions AI data usage', () => {
    render(<AgencyTermsPage />);
    expect(screen.getByText(/inteligencia artificial/)).toBeInTheDocument();
  });

  it('mentions fiscal obligations', () => {
    render(<AgencyTermsPage />);
    expect(screen.getAllByText(/IVA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/RFC/).length).toBeGreaterThan(0);
  });

  it('includes multi-jurisdiction legal references', () => {
    render(<AgencyTermsPage />);
    expect(screen.getByText(/16.1 Agencias en México/)).toBeInTheDocument();
    expect(screen.getByText(/16.2 Agencias en Estados Unidos/)).toBeInTheDocument();
    expect(screen.getByText(/16.3 Agencias en Canadá/)).toBeInTheDocument();
    expect(screen.getByText(/16.4 Agencias en Latinoamérica/)).toBeInTheDocument();
  });

  it('mentions data transfer obligations', () => {
    render(<AgencyTermsPage />);
    expect(screen.getAllByText(/LFPDPPP/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CCPA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PIPEDA/).length).toBeGreaterThan(0);
  });

  it('contains legal disclaimer', () => {
    render(<AgencyTermsPage />);
    expect(screen.getByText(/Aviso importante/)).toBeInTheDocument();
  });
});
