/** Mapea errores de Supabase/Auth a mensajes en español para el usuario. */
export function mapAuthError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : "Error de autenticación";
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return "Correo o contraseña incorrectos. Verifica tus datos.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered") || lower.includes("already exists")) {
    return "Ya existe una cuenta con ese correo electrónico.";
  }
  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return "Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.";
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("short"))) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (lower.includes("invalid email") || lower.includes("invalid_email")) {
    return "El formato del correo electrónico no es válido.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Demasiados intentos. Espera unos segundos y vuelve a intentarlo.";
  }
  if (lower.includes("session") && lower.includes("expired")) {
    return "Tu sesión expiró. Inicia sesión de nuevo.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Error de conexión. Verifica tu internet y vuelve a intentarlo.";
  }

  return message || "Error de autenticación";
}

/** Mapea errores genéricos de Supabase (insert/update/select) a español. */
export function mapSupabaseError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Error inesperado";
  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("23505")) {
    return "Ya existe un registro con esos datos.";
  }
  if (lower.includes("violates row-level security") || lower.includes("rls") || lower.includes("42501")) {
    return "No tienes permisos para realizar esta acción.";
  }
  if (lower.includes("foreign key") || lower.includes("violates foreign key") || lower.includes("23503")) {
    return "No se puede completar la operación porque faltan datos asociados.";
  }
  if (lower.includes("check constraint") || lower.includes("23514")) {
    return "Alguno de los datos ingresados no cumple con las reglas de validación.";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("timeout")) {
    return "Error de conexión con el servidor. Verifica tu internet.";
  }

  return message || "Error inesperado al guardar los datos.";
}
