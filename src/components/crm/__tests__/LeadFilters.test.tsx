import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadFilters from '../LeadFilters';

describe('LeadFilters', () => {
  const onStatusChange = vi.fn();
  const onPriorityChange = vi.fn();

  it('renders status filter dropdown', () => {
    render(
      <LeadFilters
        status=""
        priority=""
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    );
    expect(screen.getByDisplayValue('Todos los estados')).toBeInTheDocument();
  });

  it('renders priority filter dropdown', () => {
    render(
      <LeadFilters
        status=""
        priority=""
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    );
    expect(screen.getByDisplayValue('Todas')).toBeInTheDocument();
  });

  it('shows all status options', () => {
    render(
      <LeadFilters
        status=""
        priority=""
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    );
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
    expect(screen.getByText('Contactado')).toBeInTheDocument();
    expect(screen.getByText('Cualificado')).toBeInTheDocument();
    expect(screen.getByText('Propuesta enviada')).toBeInTheDocument();
    expect(screen.getByText('Ganado')).toBeInTheDocument();
    expect(screen.getByText('Perdido')).toBeInTheDocument();
  });

  it('shows all priority options', () => {
    render(
      <LeadFilters
        status=""
        priority=""
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    );
    expect(screen.getByText('Baja')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
  });

  it('calls onStatusChange when status filter changes', async () => {
    const user = userEvent.setup();
    render(
      <LeadFilters
        status=""
        priority=""
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    );

    const statusSelect = screen.getByDisplayValue('Todos los estados');
    await user.selectOptions(statusSelect, 'new');
    expect(onStatusChange).toHaveBeenCalledWith('new');
  });

  it('calls onPriorityChange when priority filter changes', async () => {
    const user = userEvent.setup();
    render(
      <LeadFilters
        status=""
        priority=""
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    );

    const prioritySelect = screen.getByDisplayValue('Todas');
    await user.selectOptions(prioritySelect, 'high');
    expect(onPriorityChange).toHaveBeenCalledWith('high');
  });

  it('displays selected status value', () => {
    render(
      <LeadFilters
        status="qualified"
        priority=""
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    );
    expect(screen.getByDisplayValue('Cualificado')).toBeInTheDocument();
  });

  it('displays selected priority value', () => {
    render(
      <LeadFilters
        status=""
        priority="high"
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    );
    expect(screen.getByDisplayValue('Alta')).toBeInTheDocument();
  });
});
