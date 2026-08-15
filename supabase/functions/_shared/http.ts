// ============================================================================
// _shared/http.ts
// Helpers de respuesta HTTP para los controladores.
//
// Garantizan un esquema JSON consistente en todos los endpoints:
//   - Éxito: { ...datos }
//   - Error: { error: { code, message, details? } }
//
// `handle` envuelve un controlador y centraliza el manejo de errores.
// ============================================================================

import { getCorsHeaders } from "./cors.ts";
import { StripeServiceError } from "./stripe/errors.ts";

/** Respuesta JSON con cabeceras CORS + Content-Type. */
export function json(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** 200 OK. */
export function ok(data: unknown, corsHeaders: Record<string, string>): Response {
  return json(data, 200, corsHeaders);
}

/** 201 Created. */
export function created(data: unknown, corsHeaders: Record<string, string>): Response {
  return json(data, 201, corsHeaders);
}

/** Responde con un StripeServiceError en su esquema estructurado. */
export function fail(
  err: StripeServiceError,
  corsHeaders: Record<string, string>,
): Response {
  return json(err.toJSON(), err.status, corsHeaders);
}

/**
 * Envuelve un controlador convirtiendo cualquier excepción en una respuesta
 * JSON estructurada (500 para errores no esperados).
 */
export async function handle(
  req: Request,
  fn: (corsHeaders: Record<string, string>) => Promise<Response>,
): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);

  // Preflight CORS.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    return await fn(corsHeaders);
  } catch (err) {
    if (err instanceof StripeServiceError) {
      return fail(err, corsHeaders);
    }

    // Error inesperado: lo logueamos en el servidor y devolvemos algo genérico.
    console.error("[http] error no controlado:", err);
    return json(
      { error: { code: "internal_error", message: "Error interno del servidor" } },
      500,
      corsHeaders,
    );
  }
}
