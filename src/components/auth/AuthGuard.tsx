import { Navigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "@/components/ui/Spinner";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAgency?: boolean;
  requireSuperAdmin?: boolean;
  requireTraveler?: boolean;
}

export default function AuthGuard({
  children,
  requireAgency = false,
  requireSuperAdmin = false,
  requireTraveler = false,
}: AuthGuardProps) {
  const { user, profile, loading, isAgency, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(requireAgency);

  useEffect(() => {
    if (!requireAgency || !profile?.tenant_id) {
      setChecking(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("agencies_tenants")
        .select("status")
        .eq("tenant_id", profile.tenant_id!)
        .single();
      setTenantStatus(data?.status ?? null);
      setChecking(false);
    })();
  }, [requireAgency, profile?.tenant_id]);

  if (loading || checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // SuperAdmin bypasses all role checks except requireSuperAdmin
  if (isSuperAdmin) {
    if (requireSuperAdmin) return <>{children}</>;
    // SuperAdmin can access everything
    return <>{children}</>;
  }

  // requireSuperAdmin: only SuperAdmin allowed
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // requireAgency: only agency users allowed
  if (requireAgency && !isAgency) {
    if (profile?.role_name === "Agency_Pending") {
      return <Navigate to="/auth/agency" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // requireTraveler: agency users redirected to their dashboard
  if (requireTraveler && isAgency) {
    return <Navigate to="/agency/dashboard" replace />;
  }

  // Suspended agencies can only access settings
  if (
    requireAgency &&
    tenantStatus === "Suspendido por Pago" &&
    location.pathname !== "/agency/settings"
  ) {
    return <Navigate to="/agency/settings" replace />;
  }

  return <>{children}</>;
}
