import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getCurrencySymbol,
} from '../formatters';

describe('formatCurrency', () => {
  it('formats MXN currency correctly', () => {
    const result = formatCurrency(1234.56, 'MXN');
    expect(result).toContain('$');
    expect(result).toContain('1,234');
    expect(result).toContain('56');
  });

  it('formats USD currency correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234');
    expect(result).toContain('56');
  });

  it('formats EUR currency correctly', () => {
    const result = formatCurrency(1234.56, 'EUR');
    expect(result).toContain('€');
    expect(result).toContain('1.234');
  });

  it('uses MXN as default currency', () => {
    const result = formatCurrency(100);
    expect(result).toContain('$');
  });

  it('formats zero correctly', () => {
    const result = formatCurrency(0, 'MXN');
    expect(result).toContain('0');
  });

  it('formats large numbers correctly', () => {
    const result = formatCurrency(1000000, 'MXN');
    expect(result).toContain('1,000,000');
  });

  it('formats negative numbers correctly', () => {
    const result = formatCurrency(-100, 'MXN');
    expect(result).toContain('-');
    expect(result).toContain('100');
  });
});

describe('formatDate', () => {
  it('formats date correctly in Spanish locale', () => {
    const result = formatDate('2024-01-15T00:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('enero');
    expect(result).toContain('15');
  });

  it('formats different dates correctly', () => {
    const result = formatDate('2024-12-25T00:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('diciembre');
    expect(result).toContain('25');
  });

  it('handles UTC timezone correctly', () => {
    const date = '2024-06-15T12:00:00Z';
    const result = formatDate(date);
    expect(result).toContain('2024');
    expect(result).toContain('junio');
  });
});

describe('formatDateTime', () => {
  it('formats date and time correctly', () => {
    const result = formatDateTime('2024-01-15T14:30:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('ene');
    expect(result).toContain('15');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('includes hour and minute', () => {
    const result = formatDateTime('2024-01-15T09:05:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "ahora mismo" for less than 60 seconds', () => {
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    vi.setSystemTime(now);
    
    const result = formatRelativeTime(thirtySecondsAgo.toISOString());
    expect(result).toBe('ahora mismo');
  });

  it('returns minutes for less than 60 minutes', () => {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    vi.setSystemTime(now);
    
    const result = formatRelativeTime(fifteenMinutesAgo.toISOString());
    expect(result).toBe('hace 15 min');
  });

  it('returns hours for less than 24 hours', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    vi.setSystemTime(now);
    
    const result = formatRelativeTime(threeHoursAgo.toISOString());
    expect(result).toBe('hace 3h');
  });

  it('returns days for less than 7 days', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    vi.setSystemTime(now);
    
    const result = formatRelativeTime(twoDaysAgo.toISOString());
    expect(result).toBe('hace 2d');
  });

  it('returns formatted date for more than 7 days', () => {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    vi.setSystemTime(now);
    
    const result = formatRelativeTime(tenDaysAgo.toISOString());
    expect(result).not.toContain('hace');
    expect(result).toMatch(/\d{4}/);
  });
});

describe('getCurrencySymbol', () => {
  it('returns correct symbol for MXN', () => {
    expect(getCurrencySymbol('MXN')).toBe('$');
  });

  it('returns correct symbol for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('US$');
  });

  it('returns correct symbol for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('returns default symbol for unknown currency', () => {
    expect(getCurrencySymbol('GBP' as any)).toBe('$');
  });
});
