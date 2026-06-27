import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router";
import { Plane, Building2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function LoginModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <Modal open={true} onClose={() => navigate("/")} title="Bienvenido" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm text-text-muted">
          Accede para continuar con tu reserva o explorar itinerarios con IA.
        </p>

        <button
          onClick={async () => {
            setLoading(true);
            await signInWithGoogle();
          }}
          disabled={loading}
          className="flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-medium text-text transition-all hover:border-primary hover:shadow-md disabled:opacity-50"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-5 w-5"
          />
          {loading ? "Conectando..." : "Continuar con Google"}
        </button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-text-muted">o</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={async () => {
              setLoading(true);
              await signInWithGoogle();
            }}
            disabled={loading}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-200 p-4 transition-all hover:border-primary hover:bg-primary/5"
          >
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-text">Soy Viajero</span>
          </button>
          <button
            onClick={() => navigate("/agency/register")}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-200 p-4 transition-all hover:border-primary hover:bg-primary/5"
          >
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-text">Soy Agencia</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
