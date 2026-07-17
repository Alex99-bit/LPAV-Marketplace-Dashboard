import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgencyCRM from '../AgencyCRM';
import { supabase } from '@/lib/supabaseClient';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    profile: { id: 'user-1', tenant_id: 'tenant-1', role_name: 'Agency_Admin' },
    loading: false,
    isAgency: true,
    isSuperAdmin: false,
    signOut: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithGoogle: vi.fn(),
  })),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: vi.fn(() => ({
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  })),
}));

describe('AgencyCRM', () => {
  const mockProfile = { tenant_id: 'tenant-1', role_name: 'Agency_Admin' };
  const mockLeads = [
    {
      lead_id: 'lead-1',
      status: 'new',
      priority: 'medium',
      estimated_budget: 25000,
      budget_currency: 'MXN',
      created_at: '2026-01-15T10:00:00Z',
      ai_qualification_progress: {},
      profiles: { full_name: 'Juan Pérez' },
      travel_packages: { title: 'Cancún All-Inclusive', region: 'Caribe Mexicano' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: { can_view_global_leads: true }, error: null }),
            }),
          }),
        } as never;
      }
      if (table === 'crm_leads') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockLeads, error: null }),
              }),
            }),
          }),
        } as never;
      }
      if (table === 'custom_roles_permissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { can_view_global_leads: true }, error: null }),
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });
  });

  it('renders CRM header', async () => {
    render(<AgencyCRM />);
    await waitFor(() => {
      expect(screen.getByText('CRM')).toBeInTheDocument();
    });
  });

  it('renders subtitle', async () => {
    render(<AgencyCRM />);
    await waitFor(() => {
      expect(screen.getByText('Gestiona tus leads y seguimiento de ventas')).toBeInTheDocument();
    });
  });

  it('renders filters', async () => {
    render(<AgencyCRM />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Todos los estados')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Todas')).toBeInTheDocument();
    });
  });

  it('displays leads after loading', async () => {
    render(<AgencyCRM />);
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Cancún All-Inclusive')).toBeInTheDocument();
    });
  });

  it('displays empty state when no leads', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: { can_view_global_leads: true }, error: null }),
            }),
          }),
        } as never;
      }
      if (table === 'crm_leads') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        } as never;
      }
      if (table === 'custom_roles_permissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { can_view_global_leads: true }, error: null }),
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    render(<AgencyCRM />);
    await waitFor(() => {
      expect(screen.getByText('No hay leads aun')).toBeInTheDocument();
    });
  });

  it('subscribes to realtime updates', async () => {
    render(<AgencyCRM />);
    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith('crm-leads-changes');
    });
  });
});
