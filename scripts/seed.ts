import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load env vars from .env ──────────────────────────────────

function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dirname ?? ".", "..", ".env");
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = env.SEED_PASSWORD || "Test1234!";

// Si se setea SEED_SKIP_STRIPE=1 (en el entorno o en .env), no se crean cuentas
// Stripe fake, para permitir el onboarding real de Stripe Connect en local.
const SKIP_STRIPE =
  process.env.SEED_SKIP_STRIPE === "1" || env.SEED_SKIP_STRIPE === "1";

// ── Test users definition ────────────────────────────────────

interface TestUser {
  email: string;
  fullName: string;
  role: string;
  tenantIndex?: number; // which agency tenant this user belongs to
}

const TEST_USERS: TestUser[] = [
  { email: "admin@lpav.com", fullName: "Super Admin LPAV", role: "SuperAdmin" },
  { email: "agencia1@viajes.com", fullName: "Carlos Mendoza", role: "Agency_Admin", tenantIndex: 0 },
  { email: "agencia2@tours.com", fullName: "María García", role: "Agency_Admin", tenantIndex: 1 },
  { email: "ventas1@viajes.com", fullName: "Ana López", role: "Agency_Collaborator", tenantIndex: 0 },
  { email: "ventas2@viajes.com", fullName: "Pedro Ruiz", role: "Agency_Agent", tenantIndex: 0 },
  { email: "viajero1@test.com", fullName: "Juan Pérez", role: "EndUser" },
  { email: "viajero2@test.com", fullName: "Laura Díaz", role: "EndUser" },
  { email: "viajero3@test.com", fullName: "Roberto Sánchez", role: "EndUser" },
];

// ── Agency tenants ───────────────────────────────────────────

const AGENCIES = [
  {
    business_name: "Viajes Increíbles S.A. de C.V.",
    rfc: "VIA123456789",
    address_text: "Av. Reforma 500, Col. Centro, CDMX, 06000",
    certification_key: "CERT-TUR-2026-001",
    plan_type: "Intermedio" as const,
    commission_rate: 18.00,
    status: "Activo" as const,
  },
  {
    business_name: "Tours del Caribe MX",
    rfc: "TOU987654321",
    address_text: "Blvd. Kukulcán Km 12, Cancún, Q.Roo, 77500",
    certification_key: "CERT-TUR-2026-002",
    plan_type: "Premium" as const,
    commission_rate: 15.00,
    status: "Activo" as const,
  },
  {
    business_name: "Aventura Maya Travel",
    rfc: "AMA123456789",
    address_text: "Calle 60 No. 299, Col. Centro, Mérida, Yuc., 97000",
    certification_key: "CERT-TUR-2026-003",
    plan_type: "Básico" as const,
    commission_rate: 20.00,
    status: "Activo" as const,
  },
  {
    business_name: "Luxury Explorer",
    rfc: "LUX987654321",
    address_text: "Paseo de la Reforma 222, Col. Juárez, CDMX, 06600",
    certification_key: "CERT-TUR-2026-004",
    plan_type: "Fundador" as const,
    commission_rate: 7.50,
    status: "Activo" as const,
  },
];

// ── Travel packages ──────────────────────────────────────────

const PACKAGES = [
  {
    tenantIndex: 0,
    title: "Riviera Maya Todo Incluido 7 Noches",
    region: "Riviera Maya",
    price: 18500,
    currency: "MXN",
    has_coordinator: true,
    publication_status: "published",
    departure_date: "2026-08-15T06:00:00Z",
  },
  {
    tenantIndex: 0,
    title: "Europa Clásica 10 Días",
    region: "Europa",
    price: 65000,
    currency: "MXN",
    has_coordinator: true,
    publication_status: "published",
    departure_date: "2026-09-01T06:00:00Z",
  },
  {
    tenantIndex: 0,
    title: "Los Cabos Aventura",
    region: "Los Cabos",
    price: 12000,
    currency: "MXN",
    has_coordinator: false,
    publication_status: "published",
    departure_date: "2026-07-20T06:00:00Z",
  },
  {
    tenantIndex: 0,
    title: "Oaxaca Cultural y Gastronómico",
    region: "Oaxaca",
    price: 8500,
    currency: "MXN",
    has_coordinator: false,
    publication_status: "draft",
    departure_date: "2026-10-01T06:00:00Z",
  },
  {
    tenantIndex: 1,
    title: "Caribe Mexicano Escapada",
    region: "Caribe Mexicano",
    price: 15000,
    currency: "MXN",
    has_coordinator: true,
    publication_status: "published",
    departure_date: "2026-08-10T06:00:00Z",
  },
  {
    tenantIndex: 1,
    title: "Puerto Vallarta Familiar",
    region: "Puerto Vallarta",
    price: 22000,
    currency: "MXN",
    has_coordinator: false,
    publication_status: "published",
    departure_date: "2026-12-20T06:00:00Z",
  },
  {
    tenantIndex: 1,
    title: "Yucatán Maya Explorer",
    region: "Yucatán",
    price: 9800,
    currency: "MXN",
    has_coordinator: false,
    publication_status: "concluded",
    departure_date: "2026-01-15T06:00:00Z",
  },
  {
    tenantIndex: 1,
    title: "Sudamérica Backpacking",
    region: "Sudamérica",
    price: 35000,
    currency: "MXN",
    has_coordinator: false,
    publication_status: "pending_review",
    departure_date: "2026-11-01T06:00:00Z",
  },
];

// ── CRM Leads ────────────────────────────────────────────────

const LEADS = [
  { tenantIndex: 0, status: "new", priority: "high", source: "marketplace", travel_type: "Playa", estimated_budget: 20000 },
  { tenantIndex: 0, status: "contacted", priority: "medium", source: "chat", travel_type: "Europa", estimated_budget: 70000 },
  { tenantIndex: 0, status: "qualified", priority: "high", source: "marketplace", travel_type: "Aventura", estimated_budget: 15000 },
  { tenantIndex: 0, status: "proposal_sent", priority: "medium", source: "referral", travel_type: "Cultural", estimated_budget: 10000 },
  { tenantIndex: 0, status: "won", priority: "high", source: "marketplace", travel_type: "Playa", estimated_budget: 18500 },
  { tenantIndex: 0, status: "lost", priority: "low", source: "other", travel_type: "Familiar", estimated_budget: 25000 },
  { tenantIndex: 1, status: "new", priority: "medium", source: "marketplace", travel_type: "Playa", estimated_budget: 16000 },
  { tenantIndex: 1, status: "contacted", priority: "high", source: "chat", travel_type: "Familiar", estimated_budget: 22000 },
  { tenantIndex: 1, status: "qualified", priority: "medium", source: "marketplace", travel_type: "Ecoturismo", estimated_budget: 12000 },
  { tenantIndex: 1, status: "won", priority: "high", source: "marketplace", travel_type: "Playa", estimated_budget: 15000 },
  { tenantIndex: 1, status: "new", priority: "low", source: "other", travel_type: "Gastronómico", estimated_budget: 8000 },
  { tenantIndex: 1, status: "proposal_sent", priority: "medium", source: "referral", travel_type: "Lujo", estimated_budget: 50000 },
];

// ── Main seed function ───────────────────────────────────────

async function seed() {
  console.log("🌱 Iniciando seed de datos de prueba...\n");

  // 1. Clean existing test data
  console.log("🧹 Limpiando datos de prueba existentes...");
  for (const user of TEST_USERS) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === user.email);
    if (found) {
      await supabase.auth.admin.deleteUser(found.id);
      console.log(`   Eliminado: ${user.email}`);
    }
  }

  // Delete existing test agencies (cascade will handle related data)
  for (const agency of AGENCIES) {
    await supabase.from("agencies_tenants").delete().eq("business_name", agency.business_name);
  }
  console.log("   Limpieza completada.\n");

  // 2. Create auth users
  console.log("👤 Creando usuarios...");
  const userIds: Record<string, string> = {};

  for (const user of TEST_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
        role_name: user.role,
      },
    });

    if (error) {
      console.error(`   Error creando ${user.email}: ${error.message}`);
      continue;
    }

    userIds[user.email] = data.user.id;
    console.log(`   ${user.email} → ${user.role} (${data.user.id.slice(0, 8)}...)`);
  }
  console.log();

  // 3. Update profiles with correct roles
  console.log("📋 Actualizando perfiles...");
  for (const user of TEST_USERS) {
    const uid = userIds[user.email];
    if (!uid) continue;

    await supabase
      .from("profiles")
      .update({ role_name: user.role })
      .eq("id", uid);
  }
  console.log("   Perfiles actualizados.\n");

  // 4. Create agency tenants
  console.log("🏢 Creando agencias...");
  const tenantIds: string[] = [];

  for (let i = 0; i < AGENCIES.length; i++) {
    const agency = AGENCIES[i];
    const adminUser = TEST_USERS.find((u) => u.tenantIndex === i && u.role === "Agency_Admin");
    if (!adminUser || !userIds[adminUser.email]) continue;

    const { data, error } = await supabase
      .from("agencies_tenants")
      .insert({
        ...agency,
        owner_user_id: userIds[adminUser.email],
        fiscal_pdf_url: "https://example.com/fiscal.pdf",
      })
      .select("tenant_id")
      .single();

    if (error) {
      console.error(`   Error creando agencia ${agency.business_name}: ${error.message}`);
      continue;
    }

    tenantIds[i] = data.tenant_id;
    console.log(`   ${agency.business_name} → ${data.tenant_id.slice(0, 8)}... (${agency.plan_type})`);
  }
  console.log();

  // 5. Link users to their tenants
  console.log("🔗 Vinculando usuarios a agencias...");
  for (const user of TEST_USERS) {
    if (user.tenantIndex === undefined) continue;
    const uid = userIds[user.email];
    const tid = tenantIds[user.tenantIndex];
    if (!uid || !tid) continue;

    await supabase
      .from("profiles")
      .update({ tenant_id: tid, role_name: user.role })
      .eq("id", uid);

    console.log(`   ${user.email} → agencia ${user.tenantIndex + 1}`);
  }
  console.log();

  // 6. Create SaaS subscriptions
  console.log("💳 Creando suscripciones SaaS...");
  for (let i = 0; i < AGENCIES.length; i++) {
    const tid = tenantIds[i];
    if (!tid) continue;

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase.from("saas_subscriptions").insert({
      tenant_id: tid,
      plan_tier: AGENCIES[i].plan_type,
      billing_cycle: "monthly",
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });

    console.log(`   Suscripción ${AGENCIES[i].plan_type} creada`);
  }
  console.log();

  // 7. Create Stripe accounts
  if (SKIP_STRIPE) {
    console.log("⏭️  Omitiendo cuentas Stripe fake (SEED_SKIP_STRIPE=1)");
  } else {
    console.log("💰 Creando cuentas Stripe...");
    for (let i = 0; i < AGENCIES.length; i++) {
      const tid = tenantIds[i];
      if (!tid) continue;

      await supabase.from("stripe_accounts").insert({
        tenant_id: tid,
        stripe_account_id: `acct_test_${i + 1}_${Date.now()}`,
        account_type: "express",
        charges_enabled: i === 0, // only first agency has charges enabled
        payouts_enabled: i === 0,
        onboarding_status: i === 0 ? "completed" : "pending",
      });

      console.log(`   Stripe ${i === 0 ? "completo" : "pendiente"} para agencia ${i + 1}`);
    }
  }
  console.log();

  // 8. Create travel packages
  console.log("📦 Creando paquetes de viaje...");
  const packageIds: string[] = [];

  for (const pkg of PACKAGES) {
    const tid = tenantIds[pkg.tenantIndex];
    if (!tid) continue;

    const { data, error } = await supabase
      .from("travel_packages")
      .insert({
        tenant_id: tid,
        title: pkg.title,
        region: pkg.region,
        price: pkg.price,
        currency: pkg.currency,
        has_coordinator: pkg.has_coordinator,
        publication_status: pkg.publication_status,
        departure_date: pkg.departure_date,
        url_flyer_storage: "https://picsum.photos/seed/" + encodeURIComponent(pkg.title) + "/600/800",
        url_thumbnail_storage: "https://picsum.photos/seed/" + encodeURIComponent(pkg.title) + "/300/400",
      })
      .select("package_id")
      .single();

    if (error) {
      console.error(`   Error: ${pkg.title} - ${error.message}`);
      continue;
    }

    packageIds.push(data.package_id);
    console.log(`   ${pkg.title} (${pkg.publication_status})`);
  }
  console.log();

  // 9. Create CRM leads
  console.log("👥 Creando leads CRM...");
  const leadIds: string[] = [];

  for (const lead of LEADS) {
    const tid = tenantIds[lead.tenantIndex];
    if (!tid) continue;

    const { data, error } = await supabase
      .from("crm_leads")
      .insert({
        tenant_id: tid,
        status: lead.status,
        priority: lead.priority,
        source: lead.source,
        travel_type: lead.travel_type,
        estimated_budget: lead.estimated_budget,
        budget_currency: "MXN",
        number_of_travelers: Math.floor(Math.random() * 4) + 1,
      })
      .select("lead_id")
      .single();

    if (error) {
      console.error(`   Error creando lead: ${error.message}`);
      continue;
    }

    leadIds.push(data.lead_id);
    console.log(`   Lead ${lead.status} (${lead.source}) → agencia ${lead.tenantIndex + 1}`);
  }
  console.log();

  // 10. Create orders
  console.log("🛒 Creando órdenes...");
  const travelerIds = Object.entries(userIds)
    .filter(([email]) => email.startsWith("viajero"))
    .map(([, id]) => id);

  const publishedPackageIds = packageIds.slice(0, 5); // first 5 are published-ish

  for (let i = 0; i < 6; i++) {
    const tenantIdx = i < 3 ? 0 : 1;
    const tid = tenantIds[tenantIdx];
    if (!tid) continue;

    const travelerId = travelerIds[i % travelerIds.length];
    const pkgId = publishedPackageIds[i % publishedPackageIds.length];
    const amount = 5000 + Math.floor(Math.random() * 30000);
    const agency = AGENCIES[tenantIdx];
    const commissionRate = agency.commission_rate / 100;
    const agencyCommission = Math.round(amount * commissionRate * 100) / 100;
    const packageSubtotal = Math.round((amount / 1.16) * 100) / 100;
    const packageIVA = Math.round((amount - packageSubtotal) * 100) / 100;
    const statuses = ["pending", "partial_paid", "paid", "paid", "partial_paid", "pending"];
    const status = statuses[i];

    await supabase.from("transactions_orders").insert({
      tenant_id: tid,
      stripe_checkout_session_id: `cs_test_seed_${i}_${Date.now()}`,
      user_id: travelerId,
      total_amount: amount,
      remaining_balance: status === "paid" ? 0 : Math.round(amount * 0.6 * 100) / 100,
      currency: "MXN",
      platform_commission_fee: agencyCommission,
      traveler_service_fee: 0,
      agency_commission_fee: agencyCommission,
      package_subtotal: packageSubtotal,
      package_iva: packageIVA,
      payment_status: status,
    });

    console.log(`   Orden $${amount} MXN (${status}, comisión ${agencyCommission})`);
  }
  console.log();

  // 11. Create wallets and points
  console.log("💳 Creando carteras y transacciones de puntos...");

  for (const userId of travelerIds) {
    const { data: wallet } = await supabase
      .from("user_wallets")
      .upsert({ user_id: userId, points_balance: 0 }, { onConflict: "user_id" })
      .select()
      .single();

    if (!wallet) continue;

    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.wallet_id,
      user_id: userId,
      type: "bonus",
      points: 5,
      description: "Bono de bienvenida",
    });

    await supabase
      .from("user_wallets")
      .update({ points_balance: 5, max_balance_reached: 5 })
      .eq("wallet_id", wallet.wallet_id);

    console.log(`  Cartera creada para ${userId.slice(0, 8)}...: 5 pts`);
  }

  const firstTraveler = travelerIds[0];
  if (firstTraveler) {
    const { data: wallet1 } = await supabase
      .from("user_wallets")
      .select("wallet_id")
      .eq("user_id", firstTraveler)
      .single();

    if (wallet1) {
      await supabase.from("wallet_transactions").insert([
        {
          wallet_id: wallet1.wallet_id,
          user_id: firstTraveler,
          type: "earn",
          points: 100,
          description: "Compra: Viaje a Cancún",
        },
        {
          wallet_id: wallet1.wallet_id,
          user_id: firstTraveler,
          type: "earn",
          points: 50,
          description: "Compra: Tour Riviera Maya",
        },
        {
          wallet_id: wallet1.wallet_id,
          user_id: firstTraveler,
          type: "referral",
          points: 2,
          description: "Referido: amigo@email.com",
        },
      ]);

      await supabase
        .from("user_wallets")
        .update({ points_balance: 157, max_balance_reached: 157 })
        .eq("wallet_id", wallet1.wallet_id);

      console.log(`  Viajero ${firstTraveler.slice(0, 8)}...: 157 pts total (100 earn + 50 earn + 5 bonus + 2 referral)`);
    }
  }

  console.log("  Carteras y puntos creados.\n");

  // 12. Create package reports
  console.log("⚠️  Creando reportes...");
  if (packageIds.length > 0) {
    await supabase.from("package_reports").insert([
      {
        package_id: packageIds[0],
        reporter_id: travelerIds[0],
        reason: "El precio no coincide con lo que me dijeron en el chat.",
        status: "pending",
      },
      {
        package_id: packageIds[2],
        reporter_id: travelerIds[1],
        reason: "Las fotos del flyer no parecen reales.",
        status: "pending",
      },
    ]);
    console.log("   2 reportes pendientes creados");
  }
  console.log();

  // 13. Create notifications
  console.log("🔔 Creando notificaciones...");
  const adminId = userIds["agencia1@viajes.com"];
  if (adminId) {
    await supabase.from("notifications").insert([
      {
        user_id: adminId,
        type: "payment_received",
        title: "Pago recibido",
        message: "Se recibió un pago de $18,500 MXN por el paquete Riviera Maya.",
        read: false,
      },
      {
        user_id: adminId,
        type: "new_message",
        title: "Nuevo mensaje",
        message: "Juan Pérez te envió un mensaje sobre el paquete Europa Clásica.",
        read: false,
      },
      {
        user_id: adminId,
        type: "package_reported",
        title: "Paquete reportado",
        message: "Tu paquete 'Riviera Maya Todo Incluido' ha sido reportado por un viajero.",
        read: true,
      },
    ]);
    console.log("   3 notificaciones creadas para agencia 1");
  }
  console.log();

  // 14. Create custom roles
  console.log("🛡️  Creando roles personalizados...");
  if (tenantIds[0]) {
    await supabase.from("custom_roles_permissions").insert({
      tenant_id: tenantIds[0],
      role_name: "Agente de Ventas",
      can_manage_catalog: false,
      can_view_global_leads: false,
      can_manage_finance: false,
      can_manage_chat: true,
    });
    console.log("   Rol 'Agente de Ventas' creado para agencia 1");
  }
  console.log();

  // ── Summary ──────────────────────────────────────────────

  console.log("═".repeat(50));
  console.log("✅ Seed completado exitosamente!");
  console.log("═".repeat(50));
  console.log();
  console.log("📧 Usuarios de prueba (password: Test1234!):");
  console.log("─".repeat(50));
  for (const user of TEST_USERS) {
    const uid = userIds[user.email];
    console.log(`  ${user.email.padEnd(25)} ${user.role.padEnd(20)} ${uid ? uid.slice(0, 8) + "..." : "ERROR"}`);
  }
  console.log();
  console.log("🏢 Agencias:");
  console.log("─".repeat(50));
  for (let i = 0; i < AGENCIES.length; i++) {
    const tid = tenantIds[i];
    console.log(`  ${AGENCIES[i].business_name.padEnd(35)} ${AGENCIES[i].plan_type.padEnd(12)} ${tid ? tid.slice(0, 8) + "..." : "ERROR"}`);
  }
  console.log();
  console.log(`  Carteras de puntos: ${travelerIds.length}`);
  console.log();
  console.log("🔗 Rutas útiles:");
  console.log("─".repeat(50));
  console.log("  Viajero:   http://localhost:5173/");
  console.log("  Login:     http://localhost:5173/auth/login");
  console.log("  Agencia:   http://localhost:5173/auth/agency");
  console.log("  Dashboard: http://localhost:5173/agency/dashboard");
  console.log("  Admin:     http://localhost:5173/admin (solo localhost)");
  console.log();
}

seed().catch((err) => {
  console.error("Seed falló:", err);
  process.exit(1);
});
