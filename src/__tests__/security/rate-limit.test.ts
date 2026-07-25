import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..", "..");

describe("Security: Rate Limiting", () => {
  describe("rate limiting implementation", () => {
    it("rate limiting module exists and is imported by edge functions", () => {
      const rateLimitPath = resolve(ROOT, "supabase", "functions", "_shared", "rateLimit.ts");
      const content = readFileSync(rateLimitPath, "utf-8");

      expect(content).toContain("checkRateLimit");
      expect(content).toContain("maxRequests");
      expect(content).toContain("windowSeconds");
      expect(content).toContain("user_behavior_logs");
    });

    it("rate limit has sensible defaults", () => {
      const rateLimitPath = resolve(ROOT, "supabase", "functions", "_shared", "rateLimit.ts");
      const content = readFileSync(rateLimitPath, "utf-8");

      expect(content).toContain("maxRequests: 30");
      expect(content).toContain("windowSeconds: 60");
    });

    it("rate limit inserts event logs to track usage", () => {
      const rateLimitPath = resolve(ROOT, "supabase", "functions", "_shared", "rateLimit.ts");
      const content = readFileSync(rateLimitPath, "utf-8");

      expect(content).toContain("event_type");
      expect(content).toContain("user_id");
      expect(content).toContain("insert");
    });

    it("returns retryAfter when rate limited", () => {
      const rateLimitPath = resolve(ROOT, "supabase", "functions", "_shared", "rateLimit.ts");
      const content = readFileSync(rateLimitPath, "utf-8");

      expect(content).toContain("retryAfter");
    });
  });

  describe("critical edge functions use rate limiting", () => {
    it("report-package uses rate limiting", () => {
      const filePath = resolve(ROOT, "supabase", "functions", "report-package", "index.ts");
      const content = readFileSync(filePath, "utf-8");
      expect(content).toContain("rateLimit");
      expect(content).toContain("checkRateLimit");
    });

    it("create-role uses rate limiting", () => {
      const filePath = resolve(ROOT, "supabase", "functions", "create-role", "index.ts");
      const content = readFileSync(filePath, "utf-8");
      expect(content).toContain("rateLimit");
      expect(content).toContain("checkRateLimit");
    });

    it("review-package uses rate limiting", () => {
      const filePath = resolve(ROOT, "supabase", "functions", "review-package", "index.ts");
      const content = readFileSync(filePath, "utf-8");
      expect(content).toContain("rateLimit");
      expect(content).toContain("checkRateLimit");
    });

    it("generate-itinerary has built-in rate limiting", () => {
      const filePath = resolve(ROOT, "supabase", "functions", "generate-itinerary", "index.ts");
      const content = readFileSync(filePath, "utf-8");
      expect(content).toContain("checkRateLimit");
    });
  });

  describe("rate limit bypass prevention", () => {
    it("no hardcoded bypass for specific users", () => {
      const rateLimitPath = resolve(ROOT, "supabase", "functions", "_shared", "rateLimit.ts");
      const content = readFileSync(rateLimitPath, "utf-8");

      expect(content).not.toMatch(/if.*userId.*===.*['"]/);
      expect(content).not.toContain("admin");
      expect(content).not.toContain("bypass");
      expect(content).not.toContain("whitelist");
      expect(content).not.toContain("exempt");
    });

    it("rate limiting is called in edge functions before returning response", () => {
      const functions = ["report-package", "create-role", "review-package"];

      for (const fn of functions) {
        const filePath = resolve(ROOT, "supabase", "functions", fn, "index.ts");
        const content = readFileSync(filePath, "utf-8");

        const getUserIdx = content.indexOf("getUser");
        const rateLimitIdx = content.indexOf("checkRateLimit");

        expect(rateLimitIdx).not.toBe(-1);

        if (getUserIdx !== -1 && rateLimitIdx !== -1) {
          expect(rateLimitIdx).toBeGreaterThan(getUserIdx);
        }
      }
    });
  });

  describe("rate_limited banned events", () => {
    it("user_behavior_logs table tracks rate limit events", () => {
      const rateLimitPath = resolve(ROOT, "supabase", "functions", "_shared", "rateLimit.ts");
      const content = readFileSync(rateLimitPath, "utf-8");

      expect(content).toContain("user_behavior_logs");
      expect(content).toContain("event_type");
    });

    it("blocking response returns retryAfter for rate limited users", () => {
      const rateLimitPath = resolve(ROOT, "supabase", "functions", "_shared", "rateLimit.ts");
      const content = readFileSync(rateLimitPath, "utf-8");

      expect(content).toContain("allowed: false");
      expect(content).toContain("remaining: 0");
    });
  });
});
