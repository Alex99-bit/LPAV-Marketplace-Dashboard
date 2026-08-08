export function isValidRFC(rfc: string): boolean {
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
  return rfcRegex.test(rfc.trim());
}

export function isValidEmail(email: string): boolean {
  if (email.includes("\0") || email.includes("\u0000")) return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
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

export function validateChatMessage(text: string): {
  valid: boolean;
  violation: string | null;
} {
  if (!text.trim()) return { valid: true, violation: null };

  const p = text;

  if (p.match(/\+?\d{10,13}/))
    return { valid: false, violation: "No se permiten números telefónicos en el chat." };

  if (p.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/))
    return { valid: false, violation: "No se permiten correos electrónicos en el chat." };

  if (p.match(/(https?:\/\/|www\.)[^\s]+/i))
    return { valid: false, violation: "No se permiten enlaces externos en el chat." };

  if (p.match(/\b[a-z0-9]([a-z0-9-]*[a-z0-9])?\.(com|mx|org|net|io|co|dev|app|me|site|online)\b/i))
    return { valid: false, violation: "No se permiten direcciones web en el chat." };

  if (p.match(/\d{18}/))
    return { valid: false, violation: "No se permiten números de cuenta (CLABE) en el chat." };

  if (p.match(/\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}/))
    return { valid: false, violation: "No se permiten números de tarjeta en el chat." };

  if (p.match(/(clabe|cuenta|transferencia|deposito|banco|bancaria|tarjeta|interbancaria)\b.*\d{4,}/i))
    return { valid: false, violation: "No se permite compartir información bancaria en el chat." };

  if (p.match(/@[\w.]{3,}/))
    return { valid: false, violation: "No se permiten menciones de redes sociales en el chat." };

  if (p.match(/(facebook\.com|instagram\.com|tiktok\.com|wa\.me|t\.me|twitter\.com|x\.com|linkedin\.com)/i))
    return { valid: false, violation: "No se permiten enlaces a redes sociales en el chat." };

  if (p.match(/\b(facebook|instagram|whatsapp|whats|telegram|tiktok|twitter)\s*[:.]?\s*\w+/i))
    return { valid: false, violation: "No se permite compartir redes sociales en el chat." };

  if (p.match(/(escr[ií]beme|m[aá]rcame|ll[aá]mame|cont[aá]ctame|whatsapp|whats|wsp)\b.*\d{4,}/i))
    return { valid: false, violation: "No se permite compartir información de contacto en el chat." };

  if (p.match(/\b(mi\s+(correo|email|n[uú]mero|tel[eé]fono|tel|cel|celular))\b/i))
    return { valid: false, violation: "No se permite compartir información de contacto en el chat." };

  if (p.match(/\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d[\s.-]+\d/))
    return { valid: false, violation: "No se permite compartir números de contacto en el chat." };

  return { valid: true, violation: null };
}
