import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CookiePolicyPage from '../CookiePolicyPage';

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('CookiePolicyPage', () => {
  it('renders the page title', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('Política de Cookies')).toBeInTheDocument();
  });

  it('renders all 7 sections', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('1. ¿Qué son las Cookies?')).toBeInTheDocument();
    expect(screen.getByText('2. ¿Qué Cookies Utilizamos?')).toBeInTheDocument();
    expect(screen.getByText('3. Gestión de Cookies')).toBeInTheDocument();
    expect(screen.getByText('4. Consentimiento por Jurisdicción')).toBeInTheDocument();
    expect(screen.getByText('5. Cookies de Terceros')).toBeInTheDocument();
    expect(screen.getByText('6. Actualizaciones de esta Política')).toBeInTheDocument();
    expect(screen.getByText('7. Contacto')).toBeInTheDocument();
  });

  it('documents essential cookies', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('2.1 Cookies Esenciales (Estrictamente Necesarias)')).toBeInTheDocument();
  });

  it('documents functional cookies', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('2.2 Cookies Funcionales')).toBeInTheDocument();
  });

  it('documents analytics cookies', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('2.3 Cookies de Telemetría y Analítica')).toBeInTheDocument();
  });

  it('lists specific cookie names', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('theme')).toBeInTheDocument();
    expect(screen.getByText('i18next')).toBeInTheDocument();
    expect(screen.getByText('pwa_install_dismissed')).toBeInTheDocument();
    expect(screen.getByText('cookie_consent')).toBeInTheDocument();
    expect(screen.getByText('auth_intent')).toBeInTheDocument();
  });

  it('documents GPC signal support', () => {
    render(<CookiePolicyPage />);
    expect(screen.getAllByText(/Global Privacy Control/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GPC/).length).toBeGreaterThan(0);
  });

  it('documents consent per jurisdiction', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('4.1 México')).toBeInTheDocument();
    expect(screen.getByText('4.2 Estados Unidos')).toBeInTheDocument();
    expect(screen.getByText('4.3 Canadá')).toBeInTheDocument();
    expect(screen.getByText('4.4 Latinoamérica')).toBeInTheDocument();
  });

  it('mentions Quebec Law 25 requirements', () => {
    render(<CookiePolicyPage />);
    expect(screen.getAllByText(/Ley 25/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Art. 8.1/).length).toBeGreaterThan(0);
  });

  it('mentions CCPA for US users', () => {
    render(<CookiePolicyPage />);
    expect(screen.getAllByText(/CCPA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Do Not Sell/).length).toBeGreaterThan(0);
  });

  it('documents browser configuration options', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('3.2 Configuración del Navegador')).toBeInTheDocument();
  });

  it('documents consent banner options', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText('3.1 Banner de Consentimiento')).toBeInTheDocument();
  });

  it('mentions no third-party advertising cookies', () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText(/no utiliza cookies de terceros para publicidad/)).toBeInTheDocument();
  });

  it('mentions Supabase and Stripe as third-party services', () => {
    render(<CookiePolicyPage />);
    expect(screen.getAllByText(/Supabase/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stripe/).length).toBeGreaterThan(0);
  });
});
