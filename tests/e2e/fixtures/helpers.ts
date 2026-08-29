// fixtures/helpers.ts — Funciones comunes para tests E2Es
import { type Page, type expect as Expect } from "@playwright/test";

export const BASE_URL = "http://localhost:5173";
export const SUPABASE_URL = "http://127.0.0.1:54321";
export const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/** Key de localStorage donde Supabase almacena la sesión */
export const SUPABASE_AUTH_KEY = `sb-${new URL(SUPABASE_URL).host.replace(":", "-")}-auth-token`;

/**
 * Espera a que Supabase termine de cargar el estado de auth.
 */
export async function waitForAuth(page: Page) {
  await page.waitForFunction(() => {
    const token = localStorage.getItem("sb-lpav-marketplace-auth-token");
    return token !== null;
  }, { timeout: 10_000 });
}

/**
 * Navega a una ruta y espera que cargue.
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Inserta un registro vía Supabase REST API (service role).
 */
export async function supabaseInsert(table: string, data: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * Consulta registros vía Supabase REST API.
 */
export async function supabaseQuery(table: string, params: string = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  return res.json();
}

/**
 * Actualiza registros vía Supabase REST API.
 */
export async function supabaseUpdate(table: string, filter: string, data: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * Elimina registros vía Supabase REST API.
 */
export async function supabaseDelete(table: string, filter: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  return res.ok;
}

/**
 * Reseed la base de datos (resetea todo).
 */
export async function reseedDB() {
  const { execSync } = await import("child_process");
  execSync("SEED_SKIP_STRIPE=1 npx tsx scripts/seed.ts", {
    cwd: process.cwd(),
    timeout: 60_000,
    stdio: "pipe",
  });
}

/**
 * Obtiene el primer ID de una tabla.
 */
export async function getFirstId(table: string, idColumn: string = "id"): Promise<string | null> {
  const data = await supabaseQuery(table, `select=${idColumn}&limit=1`);
  return Array.isArray(data) && data.length > 0 ? data[0][idColumn] : null;
}
