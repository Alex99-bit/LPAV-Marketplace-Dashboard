import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..", "..");

function collectSourceFiles(dir: string, extensions: string[]): string[] {
  const entries: string[] = [];
  const excluded = ["node_modules", "dist", "coverage", ".git", ".codebase-memory", "__tests__"];

  for (const item of readdirSync(dir)) {
    const fullPath = resolve(dir, item);
    if (excluded.includes(item)) continue;
    if (fullPath.includes("node_modules")) continue;

    const st = statSync(fullPath);
    if (st.isDirectory()) {
      entries.push(...collectSourceFiles(fullPath, extensions));
    } else if (extensions.includes(extname(item))) {
      entries.push(fullPath);
    }
  }

  return entries;
}

describe("Security: Service Role Key Exposure in Frontend", () => {
  const frontendExtensions = [".ts", ".tsx", ".js", ".jsx"];
  const frontendFiles = collectSourceFiles(resolve(ROOT, "src"), frontendExtensions);

  const configFiles: string[] = [];
  const rootFiles = readdirSync(ROOT);
  for (const f of rootFiles) {
    if (f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".html")) {
      configFiles.push(resolve(ROOT, f));
    }
  }

  it("no service_role key usage in frontend source code (src/)", () => {
    for (const file of frontendFiles) {
      const content = readFileSync(file, "utf-8");
      expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      expect(content).not.toMatch(/SERVICE_ROLE_KEY/);
      expect(content).not.toMatch(/service_role/);
    }
  });

  it("no VITE_ prefixed secrets beyond anon key in vite-env.d.ts", () => {
    const viteEnvPath = resolve(ROOT, "src", "vite-env.d.ts");
    const content = readFileSync(viteEnvPath, "utf-8");

    const viteSecrets = content.match(/VITE_(\w+)/g) || [];
    const forbiddenPrefixes = [
      "VITE_SUPABASE_SERVICE_ROLE",
      "VITE_STRIPE_SECRET",
      "VITE_GEMINI_API",
      "VITE_RESEND_API",
      "VITE_TWENTY_CRM_SSO_SECRET",
      "VITE_FACTURAMA_API",
    ];

    for (const secret of forbiddenPrefixes) {
      expect(content).not.toContain(secret);
    }

    const allowedSecrets = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_TWENTY_CRM_URL", "VITE_APP_URL"];
    for (const viteVar of viteSecrets) {
      expect(allowedSecrets).toContain(viteVar);
    }
  });

  it("index.html CSP does not expose service endpoints beyond expected", () => {
    const indexPath = resolve(ROOT, "index.html");
    const content = readFileSync(indexPath, "utf-8");

    expect(content).toContain("Content-Security-Policy");
    expect(content).toContain("default-src 'self'");
  });

  it("supabaseClient.ts only uses anon key, not service_role", () => {
    const supabasePath = resolve(ROOT, "src", "lib", "supabaseClient.ts");
    const content = readFileSync(supabasePath, "utf-8");

    expect(content).toContain("VITE_SUPABASE_ANON_KEY");
    expect(content).not.toContain("SERVICE_ROLE");
    expect(content).not.toContain("service_role");
  });

  it("no edge function secrets accessible from frontend", () => {
    for (const file of frontendFiles) {
      const content = readFileSync(file, "utf-8");
      expect(content).not.toMatch(/Deno\.env\.get/);
      expect(content).not.toMatch(/STRIPE_SECRET_KEY/);
      expect(content).not.toMatch(/RESEND_API_KEY/);
      expect(content).not.toMatch(/FACTURAMA_API_KEY/);
    }
  });

  it("edge functions correctly use Deno.env.get, not hardcoded values", () => {
    const edgeExtensions = [".ts"];
    const edgeFiles = collectSourceFiles(resolve(ROOT, "supabase", "functions"), edgeExtensions);

    const secretsToCheck = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "RESEND_API_KEY",
      "GEMINI_API_KEY",
      "FACTURAMA_API_KEY",
      "TWENTY_CRM_SSO_SECRET",
    ];

    for (const file of edgeFiles) {
      const skips = [
        "supabase/functions/__tests__",
      ];
      if (skips.some((s) => file.includes(s))) continue;

      const content = readFileSync(file, "utf-8");

      for (const secret of secretsToCheck) {
        const hasDenoEnvGet = content.includes(`Deno.env.get("${secret}")`);
        const hasHardcoded = new RegExp(
          `['"\`]${secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"\`]\\s*[=:]\\s*['"\`][^'{}\\s]{4,}['"\`]`,
          "i"
        ).test(content);

        if (hasHardcoded) {
          expect(hasHardcoded).toBe(false);
        }
      }
    }
  });
});
