import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeadCard from '../LeadCard';
import type { CRMLead } from '@/types';

describe('LeadCard', () => {
  const mockLead: CRMLead & {
    profiles?: { full_name: string | null } | null;
    travel_packages?: { title: string; region: string } | null;
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
    },
    ai_qualification_completed: false,
    conversation_id: 'conv-1',
    notes: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    profiles: { full_name: 'Juan Pérez' },
    travel_packages: { title: 'Cancún All-Inclusive', region: 'Caribe Mexicano' },
  };

  const onClick = vi.fn();

  it('renders traveler name', () => {
    render(<LeadCard lead={mockLead} onClick={onClick} />);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('renders package title and region', () => {
    render(<LeadCard lead={mockLead} onClick={onClick} />);
    expect(screen.getByText('Cancún All-Inclusive')).toBeInTheDocument();
    expect(screen.getByText('- Caribe Mexicano')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<LeadCard lead={mockLead} onClick={onClick} />);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('renders budget when available', () => {
    render(<LeadCard lead={mockLead} onClick={onClick} />);
    expect(screen.getByText('$25,000.00')).toBeInTheDocument();
  });

  it('renders AI qualification progress', () => {
    render(<LeadCard lead={mockLead} onClick={onClick} />);
    expect(screen.getByText('Cualificacion IA')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(<LeadCard lead={mockLead} onClick={onClick} />);
    screen.getByText('Juan Pérez').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders default traveler name when profiles is null', () => {
    const leadWithoutProfile = { ...mockLead, profiles: null };
    render(<LeadCard lead={leadWithoutProfile} onClick={onClick} />);
    expect(screen.getByText('Viajero')).toBeInTheDocument();
  });

  it('renders default package text when travel_packages is null', () => {
    const leadWithoutPackage = { ...mockLead, travel_packages: null };
    render(<LeadCard lead={leadWithoutPackage} onClick={onClick} />);
    expect(screen.getByText('Sin paquete')).toBeInTheDocument();
  });

  it('does not render budget when estimated_budget is 0', () => {
    const leadWithoutBudget = { ...mockLead, estimated_budget: 0 };
    render(<LeadCard lead={leadWithoutBudget} onClick={onClick} />);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('does not render progress when ai_qualification_progress is empty', () => {
    const leadWithoutProgress = { ...mockLead, ai_qualification_progress: {} };
    render(<LeadCard lead={leadWithoutProgress} onClick={onClick} />);
    expect(screen.queryByText('Cualificacion IA')).not.toBeInTheDocument();
  });
});
