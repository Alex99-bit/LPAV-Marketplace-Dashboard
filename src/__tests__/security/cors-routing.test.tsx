import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import LocalhostGuard from "@/components/auth/LocalhostGuard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..", "..");

describe("Security: LocalhostGuard — Admin Route Protection", () => {
  let originalHostname: string;

  beforeEach(() => {
    originalHostname = window.location.hostname;
    vi.clearAllMocks();
  });

  function setHostname(hostname: string) {
    Object.defineProperty(window, "location", {
      value: { ...window.location, hostname },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    setHostname(originalHostname);
  });

  it("allows access from localhost", () => {
    setHostname("localhost");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
  });

  it("allows access from 127.0.0.1", () => {
    setHostname("127.0.0.1");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
  });

  it("allows access from ::1 (IPv6 loopback)", () => {
    setHostname("::1");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
  });

  it("blocks access from production domain", () => {
    setHostname("lpav.mx");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByText(/403/)).toBeInTheDocument();
  });

  it("blocks access from external domain", () => {
    setHostname("evil.com");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByText(/403/)).toBeInTheDocument();
  });

  it("blocks access from IP address that is not loopback", () => {
    setHostname("192.168.1.1");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("blocks access from null/empty hostname", () => {
    setHostname("");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("blocks access from localhost-like strings that are not exact matches", () => {
    setHostname("localhost.evil.com");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("does not allow bypass via header manipulation", () => {
    setHostname("lpav.mx");
    render(
      <LocalhostGuard>
        <div data-testid="admin-content">Admin Panel</div>
      </LocalhostGuard>
    );
    const restricted = screen.getByText(/Acceso Restringido/);
    expect(restricted).toBeInTheDocument();
  });
});

describe("Security: CSP Headers", () => {
  it("index.html has Content-Security-Policy meta tag", () => {
    const indexPath = resolve(ROOT, "index.html");
    const html = readFileSync(indexPath, "utf-8");

    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("default-src 'self'");
  });
});
