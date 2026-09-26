import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CookieConsentBanner, {
  getConsent,
  isAnalyticsAllowed,
  isFunctionalAllowed,
  hasConsented,
  resetConsent,
} from '../CookieConsentBanner';

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('globalPrivacyControl', undefined);
  });

  describe('utility functions', () => {
    it('hasConsented returns false when no consent stored', () => {
      expect(hasConsented()).toBe(false);
    });

    it('getConsent returns defaults when no consent stored', () => {
      const consent = getConsent();
      expect(consent.essential).toBe(true);
      expect(consent.functional).toBe(false);
      expect(consent.analytics).toBe(false);
    });

    it('isAnalyticsAllowed returns false when no consent stored', () => {
      expect(isAnalyticsAllowed()).toBe(false);
    });

    it('isFunctionalAllowed returns false when no consent stored', () => {
      expect(isFunctionalAllowed()).toBe(false);
    });

    it('resetConsent clears stored consent', () => {
      window.localStorage.setItem('cookie_consent', JSON.stringify({
        preferences: { essential: true, functional: true, analytics: true },
        timestamp: new Date().toISOString(),
        version: 1,
      }));
      expect(hasConsented()).toBe(true);
      resetConsent();
      expect(hasConsented()).toBe(false);
    });

    it('getConsent returns stored preferences when consent exists', () => {
      window.localStorage.setItem('cookie_consent', JSON.stringify({
        preferences: { essential: true, functional: true, analytics: false },
        timestamp: new Date().toISOString(),
        version: 1,
      }));
      const consent = getConsent();
      expect(consent.essential).toBe(true);
      expect(consent.functional).toBe(true);
      expect(consent.analytics).toBe(false);
    });

    it('getConsent returns defaults when version mismatch', () => {
      window.localStorage.setItem('cookie_consent', JSON.stringify({
        preferences: { essential: true, functional: true, analytics: true },
        timestamp: new Date().toISOString(),
        version: 999,
      }));
      const consent = getConsent();
      expect(consent.essential).toBe(true);
      expect(consent.functional).toBe(false);
      expect(consent.analytics).toBe(false);
    });

    it('isAnalyticsAllowed returns false when GPC is detected', () => {
      window.localStorage.setItem('cookie_consent', JSON.stringify({
        preferences: { essential: true, functional: true, analytics: true },
        timestamp: new Date().toISOString(),
        version: 1,
      }));
      Object.defineProperty(navigator, 'globalPrivacyControl', {
        value: true,
        writable: true,
        configurable: true,
      });
      expect(isAnalyticsAllowed()).toBe(false);
      Object.defineProperty(navigator, 'globalPrivacyControl', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('banner rendering', () => {
    it('shows banner when no consent has been given', () => {
      render(<CookieConsentBanner />);
      expect(screen.getByText('Usamos cookies y tecnologías de rastreo')).toBeInTheDocument();
    });

    it('does not show banner when consent already exists', () => {
      window.localStorage.setItem('cookie_consent', JSON.stringify({
        preferences: { essential: true, functional: false, analytics: false },
        timestamp: new Date().toISOString(),
        version: 1,
      }));
      const { container } = render(<CookieConsentBanner />);
      expect(container.innerHTML).toBe('');
    });

    it('shows Accept, Reject and Customize buttons', () => {
      render(<CookieConsentBanner />);
      expect(screen.getByText('Aceptar todo')).toBeInTheDocument();
      expect(screen.getByText('Rechazar')).toBeInTheDocument();
      expect(screen.getByText('Personalizar')).toBeInTheDocument();
    });

    it('shows links to Cookie Policy and Privacy Policy', () => {
      render(<CookieConsentBanner />);
      const cookieLink = screen.getByText('Política de Cookies');
      const privacyLink = screen.getByText('Política de Privacidad');
      expect(cookieLink).toBeInTheDocument();
      expect(cookieLink.closest('a')).toHaveAttribute('href', '/cookies');
      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy');
    });
  });

  describe('accept all', () => {
    it('stores all preferences enabled on accept all', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Aceptar todo'));
      const consent = getConsent();
      expect(consent.essential).toBe(true);
      expect(consent.functional).toBe(true);
      expect(consent.analytics).toBe(true);
    });

    it('hides banner after accept all', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Aceptar todo'));
      expect(screen.queryByText('Usamos cookies y tecnologías de rastreo')).not.toBeInTheDocument();
    });

    it('stores timestamp in consent record', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Aceptar todo'));
      const raw = window.localStorage.getItem('cookie_consent');
      expect(raw).toBeTruthy();
      const record = JSON.parse(raw!);
      expect(record.timestamp).toBeTruthy();
      expect(record.version).toBe(1);
    });
  });

  describe('reject all', () => {
    it('stores only essential on reject all', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Rechazar'));
      const consent = getConsent();
      expect(consent.essential).toBe(true);
      expect(consent.functional).toBe(false);
      expect(consent.analytics).toBe(false);
    });

    it('hides banner after reject', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Rechazar'));
      expect(screen.queryByText('Usamos cookies y tecnologías de rastreo')).not.toBeInTheDocument();
    });
  });

  describe('custom preferences', () => {
    it('shows detail panel when clicking customize', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Personalizar'));
      expect(screen.getByText('Personalizar cookies')).toBeInTheDocument();
    });

    it('shows all three categories in detail panel', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Personalizar'));
      expect(screen.getByText('Esenciales')).toBeInTheDocument();
      expect(screen.getByText('Funcionales')).toBeInTheDocument();
      expect(screen.getByText('Telemetría y Analítica')).toBeInTheDocument();
    });

    it('essential category is always enabled and shows label', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Personalizar'));
      const checkboxes = screen.getAllByRole('checkbox');
      const essentialCheckbox = checkboxes[0] as HTMLInputElement;
      expect(essentialCheckbox).toBeTruthy();
      expect(essentialCheckbox.checked).toBe(true);
      expect(screen.getByText('Siempre activas')).toBeInTheDocument();
    });

    it('saves custom preferences when clicking save', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Personalizar'));
      const checkboxes = screen.getAllByRole('checkbox');
      const functionalCheckbox = checkboxes[1] as HTMLInputElement;
      const analyticsCheckbox = checkboxes[2] as HTMLInputElement;

      if (!functionalCheckbox.checked) fireEvent.click(functionalCheckbox);
      if (analyticsCheckbox.checked) fireEvent.click(analyticsCheckbox);

      fireEvent.click(screen.getByText('Guardar preferencias'));

      const consent = getConsent();
      expect(consent.essential).toBe(true);
      expect(consent.functional).toBe(true);
      expect(consent.analytics).toBe(false);
    });

    it('returns to summary panel when closing detail', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Personalizar'));
      expect(screen.getByText('Personalizar cookies')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Cerrar configuración'));
      expect(screen.getByText('Usamos cookies y tecnologías de rastreo')).toBeInTheDocument();
    });

    it('reject all button works from detail panel', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Personalizar'));
      const rejectButtons = screen.getAllByText('Rechazar todo');
      fireEvent.click(rejectButtons[0]);
      const consent = getConsent();
      expect(consent.functional).toBe(false);
      expect(consent.analytics).toBe(false);
    });

    it('accept all button works from detail panel', () => {
      render(<CookieConsentBanner />);
      fireEvent.click(screen.getByText('Personalizar'));
      const acceptButtons = screen.getAllByText('Aceptar todo');
      fireEvent.click(acceptButtons[0]);
      const consent = getConsent();
      expect(consent.functional).toBe(true);
      expect(consent.analytics).toBe(true);
    });
  });

  describe('GPC detection', () => {
    it('auto-restricts cookies when GPC signal detected', () => {
      Object.defineProperty(navigator, 'globalPrivacyControl', {
        value: true,
        writable: true,
        configurable: true,
      });
      render(<CookieConsentBanner />);
      const consent = getConsent();
      expect(consent.essential).toBe(true);
      expect(consent.functional).toBe(false);
      expect(consent.analytics).toBe(false);
      Object.defineProperty(navigator, 'globalPrivacyControl', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });
  });
});
