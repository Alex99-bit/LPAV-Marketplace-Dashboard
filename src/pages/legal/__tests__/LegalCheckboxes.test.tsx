import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import LoginPage from '../../auth/LoginPage';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
    functions: { invoke: vi.fn() },
  },
}));

const mockSignUpWithEmail = vi.fn();
const mockSignInWithEmail = vi.fn();
const mockSignInWithGoogle = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    isAgency: false,
    isSuperAdmin: false,
    signOut: vi.fn(),
    signInWithEmail: mockSignInWithEmail,
    signUpWithEmail: mockSignUpWithEmail,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

describe('LoginPage - Legal Checkboxes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLogin = (initialRoute = '/auth/login') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('choice screen', () => {
    it('shows the welcome screen with traveler and agency options', () => {
      renderLogin();
      expect(screen.getByText('Bienvenido a Avimo')).toBeInTheDocument();
      expect(screen.getByText('Soy Viajero')).toBeInTheDocument();
      expect(screen.getByText('Soy Agencia')).toBeInTheDocument();
    });

    it('does not show legal checkboxes on choice screen', () => {
      renderLogin();
      expect(screen.queryByText(/Términos y Condiciones/)).not.toBeInTheDocument();
    });
  });

  describe('traveler registration', () => {
    it('shows legal checkboxes when in registration mode', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Soy Viajero'));
      const registerLink = screen.getByText(/Regístrate/);
      fireEvent.click(registerLink);

      expect(screen.getByText(/Términos y Condiciones/)).toBeInTheDocument();
      expect(screen.getByText(/Política de Privacidad/)).toBeInTheDocument();
    });

    it('shows link to /terms in the terms checkbox', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Soy Viajero'));
      const registerLink = screen.getByText(/Regístrate/);
      fireEvent.click(registerLink);

      const termsLink = screen.getByText('Términos y Condiciones');
      expect(termsLink.closest('a')).toHaveAttribute('href', '/terms');
    });

    it('shows link to /privacy in the privacy checkbox', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Soy Viajero'));
      const registerLink = screen.getByText(/Regístrate/);
      fireEvent.click(registerLink);

      const privacyLink = screen.getByText('Política de Privacidad');
      expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy');
    });

    it('shows link to /cookies in the privacy checkbox text', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Soy Viajero'));
      const registerLink = screen.getByText(/Regístrate/);
      fireEvent.click(registerLink);

      const cookiesLink = screen.getByText('Política de Cookies');
      expect(cookiesLink.closest('a')).toHaveAttribute('href', '/cookies');
    });

    it('checkboxes are unchecked by default', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Soy Viajero'));
      const registerLink = screen.getByText(/Regístrate/);
      fireEvent.click(registerLink);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });

    it('shows error when trying to register without accepting terms', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Soy Viajero'));
      const registerLink = screen.getByText(/Regístrate/);
      fireEvent.click(registerLink);

      const submitBtn = screen.getByRole('button', { name: /Crear Cuenta/i });
      expect(submitBtn).toBeDisabled();
    });

    it('mentions telemetry in privacy checkbox text', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Soy Viajero'));
      const registerLink = screen.getByText(/Regístrate/);
      fireEvent.click(registerLink);

      expect(screen.getByText(/telemetría de comportamiento/i)).toBeInTheDocument();
    });
  });

  describe('traveler login', () => {
    it('does not show legal checkboxes in login mode', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Soy Viajero'));

      expect(screen.getAllByText('Iniciar Sesión').length).toBeGreaterThan(0);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });
});
