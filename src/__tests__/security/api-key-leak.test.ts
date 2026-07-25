import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..", "..");

function collectFiles(dir: string, ext: string[]): string[] {
  const entries: string[] = [];
  const excluded = ["node_modules", "dist", "coverage", ".git", ".codebase-memory"];

  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = resolve(dir, item);
    if (excluded.includes(item)) continue;
    if (fullPath.includes("node_modules")) continue;
    if (fullPath.includes("__tests__")) continue;

    const st = statSync(fullPath);
    if (st.isDirectory()) {
      entries.push(...collectFiles(fullPath, ext));
    } else if (ext.includes(extname(item))) {
      entries.push(fullPath);
    }
  }

  return entries;
}

describe("Security: API Key Leak Prevention", () => {
  const sourceFiles = collectFiles(resolve(ROOT, "src"), [".ts", ".tsx"]);

  describe("Gemini API key not in query params", () => {
    it("ai-qualify-lead uses X-Goog-Api-Key header, not query param", () => {
      const file = resolve(ROOT, "supabase", "functions", "ai-qualify-lead", "index.ts");
      const content = readFileSync(file, "utf-8");

      expect(content).toContain("X-Goog-Api-Key");
      expect(content).toContain("API_KEY");
      expect(content).not.toMatch(/generateContent\?key=/);
    });

    it("generate-itinerary uses X-Goog-Api-Key header, not query param", () => {
      const file = resolve(ROOT, "supabase", "functions", "generate-itinerary", "index.ts");
      const content = readFileSync(file, "utf-8");

      expect(content).toContain("X-Goog-Api-Key");
      expect(content).toContain("API_KEY");
      expect(content).not.toMatch(/generateContent\?key=/);
    });
  });

  describe("no API keys in URL query strings", () => {
    it("no API keys passed as URL query parameters in frontend", () => {
      for (const file of sourceFiles) {
        const content = readFileSync(file, "utf-8");
        const urlWithApiKey = content.match(/\?[^"'`\s]*?(?:api_key|apikey|api-key|key)=[^"'`&\s]+/gi);
        if (urlWithApiKey) {
          expect(urlWithApiKey).toEqual([]);
        }
      }
    });

    it("no authorization tokens in URL construction", () => {
      for (const file of sourceFiles) {
        const content = readFileSync(file, "utf-8");
        const urlWithBearer = content.match(/\?(?:access_token|bearer|auth)=[^"'`&\s]+/gi);
        if (urlWithBearer) {
          expect(urlWithBearer).toEqual([]);
        }
      }
    });
  });

  describe("edge function secrets in URL params", () => {
    it("no secrets leaked via fetch URL params in edge functions", () => {
      const edgeFiles = collectFiles(
        resolve(ROOT, "supabase", "functions"),
        [".ts"]
      ).filter((f) => !f.includes("__tests__"));

      for (const file of edgeFiles) {
        const content = readFileSync(file, "utf-8");

        const urlWithSecret = content.match(
          /fetch\s*\(\s*`[^`]*\$\{(?:SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET|RESEND_API_KEY|GEMINI_API_KEY|FACTURAMA_API_KEY|TWENTY_CRM_SSO_SECRET)\}[^`]*`/i
        );

        if (urlWithSecret) {
          expect(urlWithSecret).toEqual([]);
        }
      }
    });
  });

  describe("no secrets in localStorage access", () => {
    it("no API keys stored in localStorage", () => {
      for (const file of sourceFiles) {
        const content = readFileSync(file, "utf-8");

        const localStorageWithSecret = content.match(
          /localStorage\.(?:setItem|getItem)\s*\(\s*['"`](?:api_key|apikey|secret|password|token|auth)['"`]/i
        );

        if (localStorageWithSecret && !file.includes("auth_intent") && !file.includes("test")) {
          expect(localStorageWithSecret).toEqual([]);
        }
      }
    });
  });

  describe("no secrets in console.log", () => {
    it("no API key values logged to console (in edge functions)", () => {
      const edgeFiles = collectFiles(
        resolve(ROOT, "supabase", "functions"),
        [".ts"]
      ).filter((f) => !f.includes("__tests__"));

      for (const file of edgeFiles) {
        const content = readFileSync(file, "utf-8");

        const logWithSecret = content.match(
          /console\.(?:log|error|warn)\s*\([^)]*(?:API_KEY|apiKey|secret|password|SERVICE_ROLE)[^)]*\)/i
        );

        if (logWithSecret) {
          expect(logWithSecret).toEqual([]);
        }
      }
    });
  });

  describe("no secrets in error messages", () => {
    it("error responses do not leak configuration values", () => {
      const edgeFiles = collectFiles(
        resolve(ROOT, "supabase", "functions"),
        [".ts"]
      ).filter((f) => !f.includes("__tests__"));

      for (const file of edgeFiles) {
        const content = readFileSync(file, "utf-8");

        const errorWithSecret = content.match(
          /(?:new Error|throw new Error|Response\([^)]*error[^)]*)\s*\([^)]*\$\{[^}]*(?:API_KEY|apiKey|secret|password|SERVICE_ROLE|STRIPE_SECRET)[^}]*\}[^)]*\)/i
        );

        if (errorWithSecret) {
          expect(errorWithSecret).toEqual([]);
        }
      }
    });
  });
});
