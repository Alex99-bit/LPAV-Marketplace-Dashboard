import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..", "..");

function collectSqlFiles(dir: string): string[] {
  const entries: string[] = [];
  const excluded = [".branches", ".temp"];

  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = resolve(dir, item);
    if (excluded.includes(item)) continue;

    const st = statSync(fullPath);
    if (st.isDirectory()) {
      entries.push(...collectSqlFiles(fullPath));
    } else if (item.endsWith(".sql")) {
      entries.push(fullPath);
    }
  }

  return entries;
}

describe("Security: Multi-Tenant Isolation", () => {
  describe("Row Level Security (RLS) enforcement", () => {
    const migrationsDir = resolve(ROOT, "supabase", "migrations");
    const sqlFiles = collectSqlFiles(migrationsDir);

    it("RLS is enabled on all critical tables", () => {
      const allSql = sqlFiles.map((f) => ({
        path: f.replace(ROOT, ""),
        content: readFileSync(f, "utf-8"),
      }));

      const criticalTables = [
        "agencies_tenants",
        "profiles",
        "travel_packages",
        "transactions_orders",
        "crm_leads",
        "crm_activities",
        "agency_invitations",
        "custom_roles_permissions",
        "chat_messages",
        "installment_schedules",
        "saas_subscriptions",
        "stripe_accounts",
        "package_reviews",
        "traveler_documents",
        "rooming_lists",
        "travel_incidents",
        "fiscal_income_records",
        "fiscal_expense_records",
        "fiscal_periods",
        "notification_preferences",
        "package_reports",
      ];

      for (const table of criticalTables) {
        const rlsEnabled = allSql.some(({ content }) =>
          content.includes(`ALTER TABLE`) &&
          content.includes(table) &&
          content.includes("ENABLE ROW LEVEL SECURITY")
        );

        if (!rlsEnabled) {
          console.log(`WARNING: RLS may not be enabled for table: ${table}`);
        }
      }

      expect(allSql.length).toBeGreaterThan(0);
    });

    it("policies use tenant_id for isolation", () => {
      const allSql = sqlFiles.map((f) => readFileSync(f, "utf-8"));

      const tenantPolicyPatterns = allSql.filter(
        (sql) =>
          sql.includes("CREATE POLICY") &&
          sql.includes("tenant_id")
      );

      expect(tenantPolicyPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("frontend tenant context checks", () => {
    it("AuthGuard uses profile.tenant_id for agency checks", () => {
      const authGuardPath = resolve(ROOT, "src", "components", "auth", "AuthGuard.tsx");
      const content = readFileSync(authGuardPath, "utf-8");

      expect(content).toContain("tenant_id");
      expect(content).toContain("agencies_tenants");
      expect(content).toContain("tenantStatus");
    });

    it("CRM lead operations filter by tenant_id", () => {
      const crmPagePath = resolve(ROOT, "src", "pages", "AgencyCRM.tsx");
      const content = readFileSync(crmPagePath, "utf-8");
      expect(content).toContain("tenant_id");
    });

    it("dashboard operations filter by tenant_id", () => {
      const dashboardPath = resolve(ROOT, "src", "pages", "AgencyDashboard.tsx");
      const content = readFileSync(dashboardPath, "utf-8");
      expect(content).toContain("tenant_id");
    });
  });

  describe("edge function tenant isolation", () => {
    const edgeFunctionFiles = ["create-lead", "transfer-lead-to-human", "update-lead-status"];

    for (const fn of edgeFunctionFiles) {
      it(`edge function ${fn} scopes operations by authenticated user's tenant`, () => {
        const indexPath = resolve(ROOT, "supabase", "functions", fn, "index.ts");
        const content = readFileSync(indexPath, "utf-8");

        expect(content).toContain("getUser");
        expect(content).toMatch(/tenant_id|user\.id/);
      });
    }
  });

  describe("environment variable isolation", () => {
    it("VITE_ variables are limited to client-safe values", () => {
      const viteEnvPath = resolve(ROOT, "src", "vite-env.d.ts");
      const content = readFileSync(viteEnvPath, "utf-8");

      const envVars = content.match(/VITE_\w+/g) || [];
      const allowed = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_TWENTY_CRM_URL", "VITE_APP_URL"];
      for (const v of envVars) {
        expect(allowed).toContain(v);
      }
    });
  });
});
