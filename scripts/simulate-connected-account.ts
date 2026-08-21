// ============================================================================
// simulate-connected-account.ts
// Crea una cuenta Express de Stripe (API V2) para una agencia y genera el
// enlace de onboarding, para poder probar el flujo de "Registro de cuenta
// bancaria" sin depender del botón de la UI (y con los requisitos reducidos).
//
// Uso:
//   node scripts/simulate-connected-account.ts agencia1@viajes.com
//
// Qué hace:
//   1. Crea la cuenta Express V2 (recipient config, stripe_transfers).
//   2. Pre-completa identity.entity_type y defaults.profile.business_url
//      (los únicos campos que Stripe permite setear programáticamente).
//   3. Guarda el stripe_account_id en agencies_tenants + stripe_accounts.
//   4. Genera el Account Link de onboarding y lo imprime.
//
// NOTA: El TOS (términos de servicio) de una cuenta Express SIEMPRE debe
// aceptarse en el flujo alojado de Stripe (no se puede hacer "en nombre de").
// En modo test, al abrir el enlace solo hay que pulsar "Rellenar con datos
// de prueba" y aceptar. Para pagos (destination charge) solo se necesita la
// capability stripe_transfers; la cuenta bancaria solo es para retiros.
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const STRIPE_VERSION = "2026-07-29.dahlia";
const APP_ORIGIN = process.env.VITE_APP_URL || "http://localhost:5173";

// ── Cargar .env ──────────────────────────────────────────────
function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dirname ?? ".", "..", ".env");
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}
if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.startsWith("sk_placeholder")) {
  console.error("Falta STRIPE_SECRET_KEY en .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Cliente mínimo de Stripe V2 vía fetch ────────────────────
async function stripeV2(path: string, body: unknown): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v2/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/json",
      "Stripe-Version": STRIPE_VERSION,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Stripe error (${res.status}): ${JSON.stringify(json.error ?? json)}`,
    );
  }
  return json;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/simulate-connected-account.ts <email-agencia>");
    process.exit(1);
  }

  // 1. Localizar la agencia (profile + tenant) por email.
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("tenant_id, email")
    .eq("email", email)
    .single();

  if (profileErr || !profile?.tenant_id) {
    console.error(`No se encontró agencia para ${email}:`, profileErr?.message);
    process.exit(1);
  }

  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("business_name")
    .eq("tenant_id", profile.tenant_id)
    .single();

  console.log(`\n🏢 Agencia: ${tenant?.business_name ?? "N/A"} (${email})`);

  // 2. Crear cuenta Express V2.
  console.log("➡️  Creando cuenta conectada Express (V2)...");
  const account = await stripeV2("core/accounts", {
    display_name: tenant?.business_name ?? "Agencia",
    contact_email: email,
    identity: { country: "mx" },
    dashboard: "express",
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
  });
  console.log(`   Cuenta: ${account.id}`);

  // 3. Pre-completar los campos que Stripe permite vía API.
  console.log("➡️  Pre-completando entity_type y business_url...");
  await stripeV2(`core/accounts/${account.id}`, {
    identity: { entity_type: "individual" },
    defaults: { profile: { business_url: "https://example.com" } },
  });

  // 4. Guardar en la BD local.
  await supabase
    .from("agencies_tenants")
    .update({ stripe_account_id: account.id })
    .eq("tenant_id", profile.tenant_id);
  await supabase.from("stripe_accounts").upsert(
    {
      stripe_account_id: account.id,
      tenant_id: profile.tenant_id,
      account_type: "express",
      onboarding_status: "pending",
    },
    { onConflict: "tenant_id" },
  );
  console.log("   Guardado en agencies_tenants + stripe_accounts.");

  // 5. Generar el Account Link.
  console.log("➡️  Generando enlace de onboarding...");
  const link = await stripeV2("core/account_links", {
    account: account.id,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: `${APP_ORIGIN}/agency/settings?stripe=refresh`,
        return_url: `${APP_ORIGIN}/agency/settings?stripe=return`,
      },
    },
  });

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("✅ Cuenta conectada creada y vinculada a la agencia.");
  console.log("🔗 Enlace de onboarding (expira en ~5 min):");
  console.log(`   ${link.url}`);
  console.log("");
  console.log("📌 Para completar el registro (modo test):");
  console.log("   1. Abre el enlace en el navegador.");
  console.log("   2. Pulsa 'Rellenar con datos de prueba' / 'Use test data'.");
  console.log("   3. Acepta los Términos de Servicio.");
  console.log("   4. (Opcional) agrega una cuenta bancaria de prueba para retiros.");
  console.log("   5. Vuelve a /agency/settings — la cuenta quedará activa.");
  console.log("");
  console.log("   Nota: para COBRAR (destination charge) solo se requiere la");
  console.log("   capability stripe_transfers; la cuenta bancaria es para retiros.");
  console.log("══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Simulación falló:", err.message ?? err);
  process.exit(1);
});
