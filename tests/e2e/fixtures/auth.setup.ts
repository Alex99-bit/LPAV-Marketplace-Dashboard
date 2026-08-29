// fixtures/auth.setup.ts — Login real via API + reload para que Supabase reconozca la sesión
import { test as setup, chromium } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const USERS = {
  superAdmin: { email: "admin@lpav.com", password: "Test1234!" },
  agencyAdmin: { email: "agencia1@viajes.com", password: "Test1234!" },
  agencyCollaborator: { email: "ventas1@viajes.com", password: "Test1234!" },
  agencyAgent: { email: "ventas2@viajes.com", password: "Test1234!" },
  traveler: { email: "viajero1@test.com", password: "Test1234!" },
} as const;

/**
 * Login real: navega a la app, inyecta token via API, reload para que
 * Supabase client reconozca la sesión, y guarda storage state.
 */
async function loginAndSaveState(email: string, password: string, fileName: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Navegar a la app para establecer el dominio
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  // 2. Login via Supabase REST API y almacenar en localStorage
  const storageKey = `sb-${new URL(SUPABASE_URL).host.replace(":", "-")}-auth-token`;

  const loginResult = await page.evaluate(
    async ({ email: e, password: p, apiUrl, anonKey, key }) => {
      const res = await fetch(`${apiUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({ email: e, password: p }),
      });
      const data = await res.json();

      if (!data.access_token) {
        return { success: false, error: data.msg || "Login failed" };
      }

      // Almacenar en localStorage con el formato que Supabase espera
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + 3600 * 1000,
          expires_in: 3600,
          token_type: "bearer",
        }),
      );

      return { success: true, tokenPrefix: data.access_token.substring(0, 20) };
    },
    { email, password, apiUrl: SUPABASE_URL, anonKey: ANON_KEY, key: storageKey },
  );

  if (!loginResult.success) {
    await browser.close();
    throw new Error(`Login failed for ${email}: ${loginResult.error}`);
  }

  // 3. Recargar la página para que Supabase client lea el token y dispare onAuthStateChange
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 4. Verificar que el auth token está en localStorage
  const tokenStored = await page.evaluate((key) => {
    return localStorage.getItem(key) !== null;
  }, storageKey);

  if (!tokenStored) {
    await browser.close();
    throw new Error(`Auth token not stored in localStorage for ${email}`);
  }

  // 5. Guardar storage state
  const authDir = "tests/e2e/fixtures/.auth";
  await context.storageState({ path: `${authDir}/${fileName}.json` });

  await browser.close();
}

// ── Setup tests: uno por cada rol ──────────────────────────────

setup("login as superAdmin", async () => {
  await loginAndSaveState(USERS.superAdmin.email, USERS.superAdmin.password, "superAdmin");
});

setup("login as agencyAdmin", async () => {
  await loginAndSaveState(USERS.agencyAdmin.email, USERS.agencyAdmin.password, "agencyAdmin");
});

setup("login as agencyCollaborator", async () => {
  await loginAndSaveState(USERS.agencyCollaborator.email, USERS.agencyCollaborator.password, "agencyCollaborator");
});

setup("login as agencyAgent", async () => {
  await loginAndSaveState(USERS.agencyAgent.email, USERS.agencyAgent.password, "agencyAgent");
});

setup("login as traveler", async () => {
  await loginAndSaveState(USERS.traveler.email, USERS.traveler.password, "traveler");
});
