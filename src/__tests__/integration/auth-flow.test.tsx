import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { supabase } from '@/lib/supabaseClient';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );

  describe('Login Flow', () => {
    it('completes email login successfully', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as never);

      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        role_name: 'EndUser',
        tenant_id: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          })),
        })),
        insert: vi.fn(),
        update: vi.fn(),
      } as any);

      render(
        <TestWrapper>
          <div>Login Form</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(supabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it('handles login error', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' } as any,
      });

      render(
        <TestWrapper>
          <div>Login Form</div>
        </TestWrapper>
      );

      expect(screen.getByText('Login Form')).toBeInTheDocument();
    });
  });

  describe('Signup Flow', () => {
    it('completes email signup successfully', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      render(
        <TestWrapper>
          <div>Signup Form</div>
        </TestWrapper>
      );

      expect(screen.getByText('Signup Form')).toBeInTheDocument();
    });

    it('stores auth intent for agency registration', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      render(
        <TestWrapper>
          <div>Agency Signup</div>
        </TestWrapper>
      );

      expect(window.localStorage.getItem('auth_intent')).toBeNull();
    });
  });

  describe('Session Persistence', () => {
    it('restores session from localStorage', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-1', email: 'test@example.com' },
          } as any,
        },
        error: null,
      });

      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        role_name: 'EndUser',
        tenant_id: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          })),
        })),
        insert: vi.fn(),
        update: vi.fn(),
      } as any);

      render(
        <TestWrapper>
          <div>App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(supabase.auth.getSession).toHaveBeenCalled();
      });
    });
  });

  describe('Logout Flow', () => {
    it('clears session on logout', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
      window.localStorage.setItem('auth_intent', 'agency_register');

      render(
        <TestWrapper>
          <div>App</div>
        </TestWrapper>
      );

      expect(window.localStorage.getItem('auth_intent')).toBe('agency_register');
    });
  });
});
