import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import AuthGuard from "@/components/auth/AuthGuard";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types";

const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/supabaseClient", () => {
  const mockSingle = vi.fn().mockResolvedValue({ data: null });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    supabase: {
      from: mockFrom,
    },
  };
});

import { supabase } from "@/lib/supabaseClient";

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    role: "authenticated",
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    ...overrides,
  } as unknown as User;
}

function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
    tenant_id: null,
    role_name: "EndUser",
    avatar_url: null,
    phone: null,
    censorship_strikes: 0,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function setupAuthMock(
  user: User | null,
  profile: Profile | null,
  loading: boolean
) {
  const isAgency =
    profile?.role_name === "Agency_Admin" ||
    (profile?.tenant_id != null &&
      profile?.role_name !== "EndUser" &&
      profile?.role_name !== "SuperAdmin" &&
      profile?.role_name !== "Agency_Pending");

  const isSuperAdmin = profile?.role_name === "SuperAdmin";

  const isTraveler =
    !!user &&
    !isAgency &&
    !isSuperAdmin &&
    profile?.role_name !== "Agency_Pending";

  mockUseAuth.mockReturnValue({
    user,
    profile,
    loading,
    isAgency,
    isSuperAdmin,
    isTraveler,
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  });
}

function renderAuthGuard(
  props: {
    requireAgency?: boolean;
    requireSuperAdmin?: boolean;
    requireTraveler?: boolean;
  } = {}
) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <AuthGuard {...props}>
              <div data-testid="protected-content">Protected Content</div>
            </AuthGuard>
          }
        />
        <Route path="/auth/login" element={<div>Login Page</div>} />
        <Route path="/auth/agency" element={<div>Agency Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/agency/dashboard" element={<div>Agency Dashboard</div>} />
        <Route path="/agency/settings" element={<div>Agency Settings</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Security: Authentication Bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unauthenticated access", () => {
    it("redirects to login when no user is present", () => {
      setupAuthMock(null, null, false);
      renderAuthGuard({ requireAgency: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("redirects to login with requireSuperAdmin when unauthenticated", () => {
      setupAuthMock(null, null, false);
      renderAuthGuard({ requireSuperAdmin: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows spinner during loading, does not expose protected content", () => {
      setupAuthMock(null, null, true);
      renderAuthGuard({ requireAgency: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("EndUser role enforcement", () => {
    it("blocks EndUser from accessing agency routes", () => {
      const user = createMockUser();
      const profile = createMockProfile({ role_name: "EndUser" });
      setupAuthMock(user, profile, false);
      renderAuthGuard({ requireAgency: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("blocks EndUser from accessing superadmin routes", () => {
      const user = createMockUser();
      const profile = createMockProfile({ role_name: "EndUser" });
      setupAuthMock(user, profile, false);
      renderAuthGuard({ requireSuperAdmin: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("agency user accessing superadmin routes", () => {
    it("blocks agency admin from superadmin routes", () => {
      const user = createMockUser();
      const profile = createMockProfile({
        role_name: "Agency_Admin",
        tenant_id: "tenant-1",
      });
      setupAuthMock(user, profile, false);
      renderAuthGuard({ requireSuperAdmin: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("blocks agency collaborator from superadmin routes", () => {
      const user = createMockUser();
      const profile = createMockProfile({
        role_name: "Agency_Collaborator",
        tenant_id: "tenant-1",
      });
      setupAuthMock(user, profile, false);
      renderAuthGuard({ requireSuperAdmin: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("Agency_Pending escalation prevention", () => {
    it("blocks Agency_Pending from agency routes", () => {
      const user = createMockUser();
      const profile = createMockProfile({ role_name: "Agency_Pending" });
      setupAuthMock(user, profile, false);
      renderAuthGuard({ requireAgency: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("superadmin access", () => {
    it("allows SuperAdmin on superadmin routes", () => {
      const user = createMockUser();
      const profile = createMockProfile({ role_name: "SuperAdmin" });
      setupAuthMock(user, profile, false);
      renderAuthGuard({ requireSuperAdmin: true });
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    it("SuperAdmin bypasses agency checks", () => {
      const user = createMockUser();
      const profile = createMockProfile({ role_name: "SuperAdmin" });
      setupAuthMock(user, profile, false);
      renderAuthGuard({ requireAgency: true });
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
  });

  describe("edge cases and bypass attempts", () => {
    it("null profile with valid user is denied agency access", () => {
      const user = createMockUser();
      setupAuthMock(user, null, false);
      renderAuthGuard({ requireAgency: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("fake session without real profile denied superadmin access", () => {
      const user = createMockUser({
        id: "bypassed-user-999",
        email: "attacker@evil.com",
      });
      setupAuthMock(user, null, false);
      renderAuthGuard({ requireSuperAdmin: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("custom role with valid tenant accesses agency routes", async () => {
      const user = createMockUser();
      const profile = createMockProfile({
        role_name: "CustomRole",
        tenant_id: "tenant-1",
      });
      setupAuthMock(user, profile, false);
      renderAuthGuard({ requireAgency: true });
      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
    });

    it("loading race condition does not expose protected content", () => {
      const user = createMockUser();
      const profile = createMockProfile({ role_name: "EndUser" });
      setupAuthMock(user, profile, true);
      renderAuthGuard({ requireSuperAdmin: true });
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });
});
