// ============================================================================
// _shared/validation.ts
// Validación y saneamiento de inputs en la frontera HTTP.
//
// Regla: NUNCA confiar en el input del cliente. Validamos y desinfectamos todo
// ANTES de tocar la base de datos o la API de Stripe.
// ============================================================================

import { StripeValidationError } from "./stripe/errors.ts";

/**
 * Sanea una cadena: recorta espacios y elimina caracteres de control.
 * Devuelve la cadena limpia (o '' si es null/undefined).
 */
export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  // Elimina caracteres de control (salvo espacios) que podrían romper JSON/headers.
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

/**
 * Requiere una cadena no vacía dentro de un objeto, con longitud máxima.
 */
export function requireString(
  body: Record<string, unknown>,
  key: string,
  maxLength = 255,
): string {
  const raw = body[key];
  const value = sanitizeString(raw);

  if (!value) {
    throw new StripeValidationError(`${key} es requerido`);
  }
  if (value.length > maxLength) {
    throw new StripeValidationError(
      `${key} excede la longitud máxima (${maxLength})`,
    );
  }
  return value;
}

/**
 * Requiere un número finito mayor que 0 (montos en unidades principales).
 */
export function requireAmount(body: Record<string, unknown>, key: string): number {
  const raw = body[key];
  const value = typeof raw === "string" ? Number(raw) : raw;

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new StripeValidationError(`${key} debe ser un número mayor que 0`);
  }
  return value;
}

/**
 * Requiere una comisión válida (>= 0). El servicio valida además que sea menor
 * que el monto total.
 */
export function requireNonNegativeAmount(
  body: Record<string, unknown>,
  key: string,
): number {
  const raw = body[key];
  const value = typeof raw === "string" ? Number(raw) : raw;

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new StripeValidationError(`${key} debe ser un número >= 0`);
  }
  return value;
}

/**
 * Requiere un código de divisa ISO 4217 (3 letras).
 */
export function requireCurrency(body: Record<string, unknown>, key = "currency"): string {
  const raw = sanitizeString(body[key]);
  if (!/^[A-Za-z]{3}$/.test(raw)) {
    throw new StripeValidationError(`${key} debe ser un código ISO 4217 (ej. mxn, usd)`);
  }
  return raw.toLowerCase();
}

/**
 * Requiere un UUID v4 (referencias internas a usuarios/órdenes).
 */
export function requireUuid(body: Record<string, unknown>, key: string): string {
  const raw = sanitizeString(body[key]);
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRe.test(raw)) {
    throw new StripeValidationError(`${key} debe ser un UUID válido`);
  }
  return raw;
}

/**
 * Valida (opcional) una clave de idempotencia: cadena no vacía de longitud
 * razonable. Devuelve undefined si no se envió.
 */
export function optionalIdempotencyKey(
  body: Record<string, unknown>,
): string | undefined {
  const raw = body["idempotency_key"];
  if (raw === undefined || raw === null) return undefined;

  const value = sanitizeString(raw);
  if (!value || value.length > 255) {
    throw new StripeValidationError(
      "idempotency_key debe ser una cadena de 1 a 255 caracteres",
    );
  }
  return value;
}

/**
 * Parsea de forma segura el cuerpo JSON de una petición.
 * Lanza StripeValidationError si el body es inválido.
 */
export async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await req.json();
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    throw new StripeValidationError("El cuerpo de la petición no es JSON válido");
  }
}
