import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactPage from '../ContactPage';

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

describe('ContactPage', () => {
  it('renders the page title', () => {
    render(<ContactPage />);
    expect(screen.getByText('Contacto')).toBeInTheDocument();
  });

  it('renders the support email', () => {
    render(<ContactPage />);
    expect(screen.getByText('soporte@avimo.travel')).toBeInTheDocument();
  });

  it('renders the DPO email', () => {
    render(<ContactPage />);
    expect(screen.getByText('dpo@avimo.travel')).toBeInTheDocument();
  });

  it('renders the legal email', () => {
    render(<ContactPage />);
    expect(screen.getByText('legal@avimo.travel')).toBeInTheDocument();
  });

  it('renders the contact form', () => {
    render(<ContactPage />);
    expect(screen.getByText('Envíanos un mensaje')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Asunto')).toBeInTheDocument();
    expect(screen.getByLabelText('Mensaje')).toBeInTheDocument();
  });

  it('renders subject options', () => {
    render(<ContactPage />);
    const select = screen.getByLabelText('Asunto') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.text);
    expect(options).toContain('Consulta general');
    expect(options).toContain('Soporte técnico');
    expect(options).toContain('Facturación y pagos');
    expect(options).toContain('Privacidad y datos personales');
    expect(options).toContain('Registro de agencia');
    expect(options).toContain('Asuntos legales');
    expect(options).toContain('Otro');
  });

  it('renders the submit button', () => {
    render(<ContactPage />);
    expect(screen.getByText('Enviar mensaje')).toBeInTheDocument();
  });

  it('renders contact cards for each department', () => {
    render(<ContactPage />);
    expect(screen.getAllByText('Correo electrónico').length).toBeGreaterThan(0);
    expect(screen.getByText('Protección de Datos (DPO)')).toBeInTheDocument();
    expect(screen.getByText('Asuntos Legales')).toBeInTheDocument();
    expect(screen.getByText('Oficinas')).toBeInTheDocument();
  });

  it('mentions response time', () => {
    render(<ContactPage />);
    const responseTexts = screen.getAllByText(/48 horas/);
    expect(responseTexts.length).toBeGreaterThan(0);
  });

  it('renders the company name and location', () => {
    render(<ContactPage />);
    expect(screen.getByText(/Avimo Technologies S.A. de C.V./)).toBeInTheDocument();
    expect(screen.getByText(/Ciudad de México/)).toBeInTheDocument();
  });
});
