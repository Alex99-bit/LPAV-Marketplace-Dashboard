import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LeadDetailModal from '../LeadDetailModal';
import type { CRMLead, CRMActivity } from '@/types';
import { supabase } from '@/lib/supabaseClient';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
    })),
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

describe('LeadDetailModal', () => {
  const mockLead: CRMLead & {
    profiles?: { full_name: string | null } | null;
    travel_packages?: { title: string; region: string; price: number; currency: string } | null;
  } = {
    lead_id: 'lead-1',
    tenant_id: 'tenant-1',
    traveler_user_id: 'user-1',
    package_id: 'pkg-1',
    assigned_to: 'agent-1',
    status: 'new',
    source: 'marketplace',
    priority: 'medium',
    number_of_travelers: 2,
    preferred_travel_dates: 'Julio 2026',
    estimated_budget: 25000,
    budget_currency: 'MXN',
    travel_type: 'Playa',
    traveler_origin: 'CDMX',
    preferred_airline: null,
    accommodation_type: 'Resort',
    special_requirements: null,
    ai_qualification_progress: {
      estimated_budget: '25000',
      number_of_travelers: 2,
      preferred_travel_dates: 'Julio 2026',
      travel_type: 'Playa',
      accommodation_type: 'Resort',
      traveler_origin: 'CDMX',
    },
    ai_qualification_completed: false,
    conversation_id: 'conv-1',
    notes: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    profiles: { full_name: 'Juan Pérez' },
    travel_packages: { title: 'Cancún All-Inclusive', region: 'Caribe Mexicano', price: 30000, currency: 'MXN' },
  };

  const mockActivities: CRMActivity[] = [
    {
      activity_id: 'act-1',
      lead_id: 'lead-1',
      agent_id: null,
      activity_type: 'created',
      description: 'Lead creado desde marketplace',
      metadata: null,
      created_at: '2026-01-15T10:00:00Z',
    },
  ];

  const onClose = vi.fn();
  const onLeadUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockActivities }),
          }),
        }),
      }),
    } as never);
  });

  it('renders modal when open', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('Detalle del Lead')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <LeadDetailModal open={false} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.queryByText('Detalle del Lead')).not.toBeInTheDocument();
  });

  it('displays traveler name', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('displays package title', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('Cancún All-Inclusive')).toBeInTheDocument();
  });

  it('displays package region', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('Caribe Mexicano')).toBeInTheDocument();
  });

  it('displays budget label', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('Presupuesto estimado')).toBeInTheDocument();
  });

  it('displays extracted fields', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('2 viajeros')).toBeInTheDocument();
    expect(screen.getAllByText('Julio 2026').length).toBeGreaterThan(0);
  });

  it('displays take control button when conversation exists', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('Tomar control del chat')).toBeInTheDocument();
  });

  it('displays note input', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByPlaceholderText('Agregar nota...')).toBeInTheDocument();
  });

  it('displays activities section', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('Actividad')).toBeInTheDocument();
  });

  it('loads activities on open', async () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );

    await waitFor(() => {
      expect(screen.getByText('Lead creado')).toBeInTheDocument();
    });
  });

  it('displays special requirements when present', () => {
    const leadWithRequirements = { ...mockLead, special_requirements: 'Habitación familiar' };
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={leadWithRequirements} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText('Habitación familiar')).toBeInTheDocument();
  });

  it('displays creation date', () => {
    render(
      <LeadDetailModal open={true} onClose={onClose} lead={mockLead} onLeadUpdated={onLeadUpdated} />
    );
    expect(screen.getByText(/Creado:/)).toBeInTheDocument();
  });
});
