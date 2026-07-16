import { describe, it, expect } from 'vitest';
import {
  isValidRFC,
  isValidEmail,
  isValidPhone,
  isValidCertificationKey,
  validatePassword,
  validateRoleName,
} from '../validation';

describe('isValidRFC', () => {
  it('validates correct RFC for persona física (13 caracteres)', () => {
    expect(isValidRFC('GODE561231GR8')).toBe(true);
    expect(isValidRFC('GODE561231G18')).toBe(true);
    expect(isValidRFC('XAXX010101000')).toBe(true);
  });

  it('validates correct RFC for persona moral (12 caracteres)', () => {
    expect(isValidRFC('ABC010101AB1')).toBe(true);
    expect(isValidRFC('XYZ991231ZZ9')).toBe(true);
  });

  it('rejects invalid RFC formats', () => {
    expect(isValidRFC('')).toBe(false);
    expect(isValidRFC('ABC010101')).toBe(false);
    expect(isValidRFC('12345678901234')).toBe(false);
    expect(isValidRFC('ABC010101AB')).toBe(false);
    expect(isValidRFC('ABC010101AB12')).toBe(false);
  });

  it('handles whitespace correctly', () => {
    expect(isValidRFC('  GODE561231GR8  ')).toBe(true);
    expect(isValidRFC('GODE 561231GR8')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isValidRFC('gode561231gr8')).toBe(true);
    expect(isValidRFC('GoDe561231Gr8')).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('validates correct email formats', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co')).toBe(true);
    expect(isValidEmail('user+tag@gmail.com')).toBe(true);
    expect(isValidEmail('user123@test-domain.com')).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@.com')).toBe(false);
    expect(isValidEmail('user @domain.com')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
  });

  it('handles whitespace correctly', () => {
    expect(isValidEmail('  test@example.com  ')).toBe(true);
    expect(isValidEmail('test @example.com')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('validates correct phone formats', () => {
    expect(isValidPhone('5512345678')).toBe(true);
    expect(isValidPhone('+525512345678')).toBe(true);
    expect(isValidPhone('+52 55 1234 5678')).toBe(true);
    expect(isValidPhone('55-1234-5678')).toBe(true);
    expect(isValidPhone('+12345678901')).toBe(true);
  });

  it('rejects invalid phone formats', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('123456789')).toBe(false);
    expect(isValidPhone('+12345678901234')).toBe(false);
    expect(isValidPhone('abcdefghij')).toBe(false);
  });
});

describe('isValidCertificationKey', () => {
  it('validates correct certification key lengths', () => {
    expect(isValidCertificationKey('abc')).toBe(true);
    expect(isValidCertificationKey('1234567890')).toBe(true);
    expect(isValidCertificationKey('a'.repeat(100))).toBe(true);
  });

  it('rejects invalid certification key lengths', () => {
    expect(isValidCertificationKey('')).toBe(false);
    expect(isValidCertificationKey('ab')).toBe(false);
    expect(isValidCertificationKey('a'.repeat(101))).toBe(false);
  });

  it('handles whitespace correctly', () => {
    expect(isValidCertificationKey('  abc  ')).toBe(true);
    expect(isValidCertificationKey('   ')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('validates correct passwords', () => {
    const result = validatePassword('password123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates minimum length', () => {
    const result = validatePassword('12345');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mínimo 6 caracteres');
  });

  it('validates maximum length', () => {
    const result = validatePassword('a'.repeat(73));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Máximo 72 caracteres');
  });

  it('validates both min and max length', () => {
    const result = validatePassword('a'.repeat(73));
    expect(result.errors).toHaveLength(1);
  });

  it('accepts exactly 6 characters', () => {
    const result = validatePassword('123456');
    expect(result.valid).toBe(true);
  });

  it('accepts exactly 72 characters', () => {
    const result = validatePassword('a'.repeat(72));
    expect(result.valid).toBe(true);
  });
});

describe('validateRoleName', () => {
  it('validates correct role names', () => {
    const result = validateRoleName('Manager');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects empty role names', () => {
    const result = validateRoleName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nombre requerido');
  });

  it('rejects role names with only whitespace', () => {
    const result = validateRoleName('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nombre requerido');
  });

  it('rejects role names exceeding 100 characters', () => {
    const result = validateRoleName('a'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Máximo 100 caracteres');
  });

  it('rejects blocked words', () => {
    const blocked = ['admin', 'superadmin', 'root', 'owner', 'ceo', 'sistema', 'system'];
    blocked.forEach((word) => {
      const result = validateRoleName(word);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nombre no permitido');
    });
  });

  it('rejects role names containing blocked words', () => {
    const result = validateRoleName('SuperAdmin');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nombre no permitido');

    const result2 = validateRoleName('MyAdminRole');
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('Nombre no permitido');
  });

  it('is case insensitive for blocked words', () => {
    const result = validateRoleName('ADMIN');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nombre no permitido');

    const result2 = validateRoleName('Root');
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('Nombre no permitido');
  });

  it('accepts role names with exactly 100 characters', () => {
    const result = validateRoleName('a'.repeat(100));
    expect(result.valid).toBe(true);
  });
});
