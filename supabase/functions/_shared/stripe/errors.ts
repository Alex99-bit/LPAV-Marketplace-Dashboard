// ============================================================================
// _shared/stripe/errors.ts
// Jerarquía de errores del dominio de Stripe + mapeo de excepciones del SDK.
//
// Objetivo: que los controladores respondan SIEMPRE con un esquema JSON
// estructurado y un código HTTP correcto, sin filtrar detalles internos.
// ============================================================================

/**
 * Error base del dominio de pagos. Lleva:
 *  - code:   código de error estable para el cliente.
 *  - status: código HTTP sugerido.
 *  - details: contexto adicional (opcional, nunca secretos).
 */
export class StripeServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "StripeServiceError";
  }

  /** Representación segura para devolver al cliente. */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

/** Falta una variable de entorno o está mal configurada (error del operador). */
export class StripeConfigurationError extends StripeServiceError {
  constructor(message: string) {
    super("stripe_configuration_error", message, 500);
    this.name = "StripeConfigurationError";
  }
}

/** Input del cliente inválido (validación antes de tocar Stripe). */
export class StripeValidationError extends StripeServiceError {
  constructor(message: string, details?: unknown) {
    super("validation_error", message, 400, details);
    this.name = "StripeValidationError";
  }
}

/** Recurso no encontrado (p. ej. vendedor sin cuenta conectada). */
export class StripeNotFoundError extends StripeServiceError {
  constructor(message: string) {
    super("not_found", message, 404);
    this.name = "StripeNotFoundError";
  }
}

/** Acceso no autorizado / no autenticado. */
export class StripeUnauthorizedError extends StripeServiceError {
  constructor(message = "No autorizado") {
    super("unauthorized", message, 401);
    this.name = "StripeUnauthorizedError";
  }
}

/**
 * Mapea una excepción lanzada por el SDK de Stripe a un StripeServiceError
 * con código HTTP adecuado.
 *
 * Los errores de Stripe exponen `type` (StripeCardError, ...), `statusCode`
 * y `code`; los usamos para decidir la respuesta sin exponer secretos.
 */
export function mapStripeError(err: unknown): StripeServiceError {
  const e = err as {
    type?: string;
    statusCode?: number;
    code?: string;
    message?: string;
    decline_code?: string;
  } | null;

  const type = e?.type ?? "";
  const message = e?.message ?? "Error desconocido al procesar el pago";
  const code = e?.code ?? "stripe_error";

  switch (type) {
    // Tarjeta rechazada por el banco: 402 Payment Required.
    case "StripeCardError":
      return new StripeServiceError(
        code,
        message,
        402,
        e?.decline_code ? { decline_code: e.decline_code } : undefined,
      );

    // Petición mal formada hacia Stripe: casi siempre un bug nuestro -> 400/422.
    case "StripeInvalidRequestError":
      return new StripeServiceError(code, message, 400);

    // Errores de autenticación/permisos: fallo del lado del servidor -> 500.
    case "StripeAuthenticationError":
    case "StripePermissionError":
      return new StripeServiceError(
        "stripe_auth_error",
        "Error de autenticación con Stripe",
        500,
      );

    // Rate limit de Stripe: 429.
    case "StripeRateLimitError":
      return new StripeServiceError(code, message, 429);

    // Firma de webhook inválida: 400 (evita que Stripe reintente indefinidamente).
    case "StripeSignatureVerificationError":
      return new StripeServiceError("invalid_signature", message, 400);

    // Problema de red con Stripe: 502 Bad Gateway.
    case "StripeAPIConnectionError":
      return new StripeServiceError("stripe_connection_error", message, 502);

    // Conflicto de idempotencia: 409.
    case "StripeIdempotencyError":
      return new StripeServiceError(code, message, 409);

    default:
      return new StripeServiceError(code, message, e?.statusCode ?? 500);
  }
}
