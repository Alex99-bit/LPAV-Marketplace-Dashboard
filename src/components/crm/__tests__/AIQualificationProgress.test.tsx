import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AIQualificationProgress from '../AIQualificationProgress';

describe('AIQualificationProgress', () => {
  it('renders progress label', () => {
    render(<AIQualificationProgress fieldsExtracted={{}} />);
    expect(screen.getByText('Cualificacion IA')).toBeInTheDocument();
  });

  it('shows 0% when no fields are extracted', () => {
    render(<AIQualificationProgress fieldsExtracted={{}} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows correct percentage when required field is extracted', () => {
    render(
      <AIQualificationProgress
        fieldsExtracted={{ estimated_budget: '25000' }}
      />
    );
    expect(screen.getByText('14%')).toBeInTheDocument();
  });

  it('shows 100% when all fields are extracted', () => {
    render(
      <AIQualificationProgress
        fieldsExtracted={{
          estimated_budget: '25000',
          number_of_travelers: 2,
          preferred_travel_dates: 'Julio 2026',
          travel_type: 'Playa',
          traveler_origin: 'CDMX',
          preferred_airline: 'Volaris',
          accommodation_type: 'Resort',
        }}
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('marks required field with asterisk when not filled', () => {
    render(<AIQualificationProgress fieldsExtracted={{}} />);
    expect(screen.getByText('- Presupuesto *')).toBeInTheDocument();
  });

  it('shows filled fields with + prefix', () => {
    render(
      <AIQualificationProgress
        fieldsExtracted={{ estimated_budget: '25000' }}
      />
    );
    expect(screen.getByText('+ Presupuesto')).toBeInTheDocument();
  });

  it('shows unfilled optional fields with - prefix', () => {
    render(<AIQualificationProgress fieldsExtracted={{}} />);
    expect(screen.getByText('- Viajeros')).toBeInTheDocument();
    expect(screen.getByText('- Fechas')).toBeInTheDocument();
    expect(screen.getByText('- Tipo de viaje')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AIQualificationProgress fieldsExtracted={{}} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('ignores empty string values', () => {
    render(
      <AIQualificationProgress
        fieldsExtracted={{ estimated_budget: '' }}
      />
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('ignores null values', () => {
    render(
      <AIQualificationProgress
        fieldsExtracted={{ estimated_budget: null }}
      />
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('calculates progress correctly with partial fields', () => {
    render(
      <AIQualificationProgress
        fieldsExtracted={{
          estimated_budget: '25000',
          number_of_travelers: 2,
          preferred_travel_dates: 'Julio 2026',
        }}
      />
    );
    expect(screen.getByText('43%')).toBeInTheDocument();
  });
});
