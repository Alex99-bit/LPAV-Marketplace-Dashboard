import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage from '../PrivacyPage';

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('PrivacyPage', () => {
  it('renders the page title', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('Política de Privacidad y Aviso de Privacidad')).toBeInTheDocument();
  });

  it('renders all 14 sections', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('1. Responsable del Tratamiento de Datos')).toBeInTheDocument();
    expect(screen.getByText('2. Datos Personales que Recopilamos')).toBeInTheDocument();
    expect(screen.getByText('3. Finalidades del Tratamiento')).toBeInTheDocument();
    expect(screen.getByText('4. Telemetría y Registro de Comportamiento')).toBeInTheDocument();
    expect(screen.getByText('5. Base Legal para el Tratamiento')).toBeInTheDocument();
    expect(screen.getByText('6. Transferencias de Datos a Terceros')).toBeInTheDocument();
    expect(screen.getByText('7. Derechos del Titular de los Datos')).toBeInTheDocument();
    expect(screen.getByText('8. Cómo Ejercer sus Derechos')).toBeInTheDocument();
    expect(screen.getByText('9. Medidas de Seguridad')).toBeInTheDocument();
    expect(screen.getByText('10. Retención de Datos')).toBeInTheDocument();
    expect(screen.getByText('11. Menores de Edad')).toBeInTheDocument();
    expect(screen.getByText('12. Decisiones Automatizadas y Perfilado')).toBeInTheDocument();
    expect(screen.getByText('13. Cambios a esta Política')).toBeInTheDocument();
    expect(screen.getByText('14. Contacto')).toBeInTheDocument();
  });

  it('documents telemetry events', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/view_package/)).toBeInTheDocument();
    expect(screen.getByText(/search_query/)).toBeInTheDocument();
    expect(screen.getByText(/add_to_cart/)).toBeInTheDocument();
    expect(screen.getByText(/generate_itinerary/)).toBeInTheDocument();
    expect(screen.getByText(/rate_limit_ban/)).toBeInTheDocument();
  });

  it('documents data categories for travelers', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('2.1 Datos de Viajeros')).toBeInTheDocument();
  });

  it('documents data categories for agencies', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('2.2 Datos de Agencias')).toBeInTheDocument();
  });

  it('documents navigation and telemetry data', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('2.3 Datos de Navegación y Telemetría')).toBeInTheDocument();
  });

  it('mentions primary and secondary purposes', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('3.1 Finalidades Primarias (no requieren consentimiento adicional)')).toBeInTheDocument();
    expect(screen.getByText('3.2 Finalidades Secundarias (sujetas a consentimiento)')).toBeInTheDocument();
  });

  it('documents legal bases per jurisdiction', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('5.1 México (LFPDPPP 2025)')).toBeInTheDocument();
    expect(screen.getByText('5.2 Estados Unidos (CCPA/CPRA y leyes estatales)')).toBeInTheDocument();
    expect(screen.getByText('5.3 Canadá (PIPEDA y Ley 25 de Quebec)')).toBeInTheDocument();
    expect(screen.getByText('5.4 Latinoamérica')).toBeInTheDocument();
  });

  it('documents ARCO rights for Mexico', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('7.1 Derechos ARCO (México)')).toBeInTheDocument();
    expect(screen.getByText(/Acceso/)).toBeInTheDocument();
    expect(screen.getByText(/Rectificación/)).toBeInTheDocument();
    expect(screen.getByText(/Cancelación/)).toBeInTheDocument();
    expect(screen.getByText(/Oposición/)).toBeInTheDocument();
  });

  it('documents CCPA rights for US', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('7.2 Derechos bajo CCPA/CPRA (California/EE.UU.)')).toBeInTheDocument();
  });

  it('documents PIPEDA rights for Canada', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('7.3 Derechos bajo PIPEDA y Ley 25 (Canadá)')).toBeInTheDocument();
  });

  it('mentions third-party data transfers', () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/Stripe/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Supabase/).length).toBeGreaterThan(0);
  });

  it('mentions DPO contact email', () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText('dpo@avimo.travel').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/privacidad@avimo\.travel/).length).toBeGreaterThan(0);
  });

  it('mentions COPPA compliance for minors', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/COPPA/)).toBeInTheDocument();
  });

  it('documents data retention periods', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/user_behavior_logs/)).toBeInTheDocument();
  });

  it('mentions GPC signal support', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/Global Privacy Control/)).toBeInTheDocument();
  });
});
