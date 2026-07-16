import { Navigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "@/components/ui/Spinner";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAgency?: boolean;
  requireSuperAdmin?: boolean;
}

export default function AuthGuard({
  children,
  requireAgency = false,
  requireSuperAdmin = false,
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

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireAgency && !isAgency) {
    if (profile?.role_name === "Agency_Pending") {
      return <Navigate to="/auth/agency" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (requireAgency && tenantStatus === "Suspendido por Pago" && location.pathname !== "/agency/settings") {
    return <Navigate to="/agency/settings" replace />;
  }

  return <>{children}</>;
}
