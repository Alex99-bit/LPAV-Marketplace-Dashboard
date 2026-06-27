export function isValidRFC(rfc: string): boolean {
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
  return rfcRegex.test(rfc.trim());
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?\d{10,13}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ""));
}

export function isValidCertificationKey(key: string): boolean {
  return key.trim().length >= 3 && key.trim().length <= 100;
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 6) errors.push("Mínimo 6 caracteres");
  if (password.length > 72) errors.push("Máximo 72 caracteres");
  return { valid: errors.length === 0, errors };
}

export function validateRoleName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: "Nombre requerido" };
  if (trimmed.length > 100)
    return { valid: false, error: "Máximo 100 caracteres" };

  const blocked = [
    "admin",
    "superadmin",
    "root",
    "owner",
    "ceo",
    "sistema",
    "system",
  ];
  const lower = trimmed.toLowerCase();
  for (const word of blocked) {
    if (lower.includes(word)) {
      return { valid: false, error: "Nombre no permitido" };
    }
  }

  return { valid: true };
}
