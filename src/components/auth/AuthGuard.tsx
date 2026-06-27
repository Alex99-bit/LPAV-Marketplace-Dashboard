import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/context/AuthContext";
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
  const { user, loading, isAgency, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
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
    return <Navigate to="/agency/register" replace />;
  }

  return <>{children}</>;
}
