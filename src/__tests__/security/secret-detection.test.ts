import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..", "..");

const EXCLUDED_DIRS = ["node_modules", "dist", "coverage", ".git", ".codebase-memory", "__tests__"];
const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".yml", ".yaml",
  ".toml", ".html", ".css", ".sql", ".env.example", ".gitignore",
]);

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp; severity: string }> = [
  {
    name: "Supabase service_role key",
    regex: /sb_secret_[A-Za-z0-9_-]{30,}/,
    severity: "CRITICAL",
  },
  {
    name: "Google OAuth client secret (GOCSPX)",
    regex: /GOCSPX-[A-Za-z0-9_-]{20,}/,
    severity: "CRITICAL",
  },
  {
    name: "Stripe secret key (sk_live_)",
    regex: /sk_live_[A-Za-z0-9]{20,}/,
    severity: "CRITICAL",
  },
  {
    name: "Stripe restricted key (rk_live_)",
    regex: /rk_live_[A-Za-z0-9]{20,}/,
    severity: "CRITICAL",
  },
  {
    name: "Generic API key with key pattern",
    regex: /(?:api[_-]?key|apikey|secret|password|passwd|token)\s*[=:]\s*['"][A-Za-z0-9_\-!@#$%^&*()+=]{16,}['"]/i,
    severity: "HIGH",
  },
  {
    name: "JWT with secret prefix in source",
    regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
    severity: "HIGH",
  },
  {
    name: "Database connection string with credentials",
    regex: /(?:mongodb|postgres|postgresql|mysql|redis):\/\/[^:]+:[^@]+@/i,
    severity: "CRITICAL",
  },
  {
    name: "Private key / PEM",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    severity: "CRITICAL",
  },
  {
    name: "SSH private key",
    regex: /-----BEGIN OPENSSH PRIVATE KEY-----/,
    severity: "CRITICAL",
  },
  {
    name: "Base64-encoded key-like string (>32 chars, high entropy)",
    regex: /['"`][A-Za-z0-9+/=]{40,}['"`]/,
    severity: "MEDIUM",
  },
  {
    name: "Hardcoded admin password",
    regex: /(?:admin|super_?admin|root).*(?:password|passwd|pwd)\s*[=:]\s*['"][^'"]{4,}['"]/i,
    severity: "HIGH",
  },
  {
    name: "OAuth client_secret hardcoded",
    regex: /client[_-]?secret\s*[=:]\s*['"][A-Za-z0-9_\-]{10,}['"]/i,
    severity: "CRITICAL",
  },
  {
    name: "Resend API key",
    regex: /re_[A-Za-z0-9]{20,}/,
    severity: "HIGH",
  },
];

const ALLOWED_FILES_WITH_PASSWORD: string[] = [
  resolve(ROOT, "scripts", "seed.ts"),
  resolve(ROOT, "supabase", "functions", "__tests__", "create-lead.test.ts"),
  resolve(ROOT, "supabase", "functions", "__tests__", "transfer-lead-to-human.test.ts"),
  resolve(ROOT, "supabase", "functions", "__tests__", "update-lead-status.test.ts"),
];

interface Finding {
  file: string;
  line: number;
  match: string;
  pattern: string;
  severity: string;
}

function collectFiles(dir: string, extensions: Set<string>): string[] {
  const entries: string[] = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = resolve(dir, item);
    if (EXCLUDED_DIRS.includes(item)) continue;
    if (fullPath.includes("node_modules")) continue;

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      entries.push(...collectFiles(fullPath, extensions));
    } else if (extensions.has(extname(item)) || extensions.has(item)) {
      entries.push(fullPath);
    } else if (item.endsWith(".env.example")) {
      entries.push(fullPath);
    }
  }

  return entries;
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("--")) continue;
    if (trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    for (const pattern of SECRET_PATTERNS) {
      const matches = trimmed.match(pattern.regex);
      if (matches) {
        for (const m of matches) {
          if (m.length > 4) {
            findings.push({
              file: filePath.replace(ROOT, ""),
              line: i + 1,
              match: m.length > 30 ? m.substring(0, 30) + "..." : m,
              pattern: pattern.name,
              severity: pattern.severity,
            });
          }
        }
      }
    }
  }

  return findings;
}

function isKnownFalsePositive(finding: Finding): boolean {
  if (finding.pattern === "Base64-encoded key-like string" && finding.severity === "MEDIUM") {
    return true;
  }

  if (finding.pattern === "Generic API key with key pattern" &&
      finding.file === "/supabase/functions/_shared/cors.ts" &&
      finding.match.includes("apikey")) {
    return true;
  }

  if (finding.pattern === "Generic API key with key pattern" &&
      finding.file === "/supabase/config.toml" &&
      finding.match.includes('"env(')) {
    return true;
  }

  if (finding.file.startsWith("/src/__tests__/security/")) {
    return true;
  }

  return false;
}

describe("Security: Hardcoded Secret Detection", () => {
  let allFindings: Finding[] = [];

  beforeAll(() => {
    const files = collectFiles(ROOT, TEXT_EXTENSIONS);
    allFindings = [];

    for (const file of files) {
      const findings = scanFile(file);
      for (const f of findings) {
        if (!isKnownFalsePositive(f)) {
          allFindings.push(f);
        }
      }
    }
  });

  it("no hardcoded Supabase service_role keys in source code", () => {
    const serviceRoleFindings = allFindings.filter(
      (f) => f.pattern === "Supabase service_role key"
    );
    expect(serviceRoleFindings).toEqual([]);
  });

  it("no hardcoded Stripe live secret keys in source code", () => {
    const stripe = allFindings.filter(
      (f) =>
        f.pattern.includes("Stripe secret") ||
        f.pattern.includes("Stripe restricted")
    );
    expect(stripe).toEqual([]);
  });

  it("no hardcoded Google OAuth client secrets in source code", () => {
    const google = allFindings.filter(
      (f) => f.pattern.includes("Google OAuth")
    );
    expect(google).toEqual([]);
  });

  it("no hardcoded private keys or PEM files in source code", () => {
    const pem = allFindings.filter(
      (f) =>
        f.pattern.includes("Private key") ||
        f.pattern.includes("SSH private")
    );
    expect(pem).toEqual([]);
  });

  it("no hardcoded database connection strings with credentials", () => {
    const db = allFindings.filter(
      (f) => f.pattern.includes("Database connection")
    );
    expect(db).toEqual([]);
  });

  it("no hardcoded client_secret values in source code", () => {
    const oauth = allFindings.filter(
      (f) => f.pattern.includes("OAuth client_secret")
    );
    expect(oauth).toEqual([]);
  });

  it("no JWT tokens with signatures embedded in source code", () => {
    const jwt = allFindings.filter(
      (f) => f.pattern.includes("JWT with secret")
    );
    expect(jwt).toEqual([]);
  });

  it("no hardcoded Resend API keys", () => {
    const resend = allFindings.filter(
      (f) => f.pattern.includes("Resend API key")
    );
    expect(resend).toEqual([]);
  });

  it("full scan report - all findings documented", () => {
    const criticalHigh = allFindings.filter(
      (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
    );
    if (criticalHigh.length > 0) {
      console.log("\n=== SECURITY SCAN FINDINGS (CRITICAL/HIGH) ===");
      criticalHigh.forEach((f) => {
        console.log(
          `[${f.severity}] ${f.file}:${f.line} — ${f.pattern} → "${f.match}"`
        );
      });
    }
    expect(criticalHigh).toEqual([]);
  });
});
