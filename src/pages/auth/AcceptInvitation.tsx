import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Building2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "@/components/auth/GoogleButton";
import { isValidEmail, validatePassword } from "@/lib/validation";
import type { AgencyInvitation } from "@/types";

type Step = "loading" | "invalid" | "needs_auth_login" | "needs_auth_register" | "ready" | "done" | "error";

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, refreshProfile } =
    useAuth();
  const [step, setStep] = useState<Step>("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<AgencyInvitation | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!token) {
      setStep("invalid");
      return;
    }
    validateToken();
  }, [token]);

  useEffect(() => {
    if (user && invitation) {
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        setError(
          `Esta invitacion es para ${invitation.email}. Cierra sesion y usa ese correo.`
        );
        setStep("error");
      } else {
        setStep("ready");
      }
    }
  }, [user, invitation]);

  const validateToken = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("agency_invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (fetchError || !data) {
        setStep("invalid");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStep("invalid");
        return;
      }

      setInvitation(data);
      if (user) {
        setStep(user.email?.toLowerCase() === data.email.toLowerCase() ? "ready" : "error");
      } else {
        setStep("needs_auth_login");
      }
    } catch {
      setStep("invalid");
    }
  };

  const handleCreateAccount = async () => {
    setError("");

    if (!invitation) return;

    if (fullName.trim().length < 2) {
      setError("Ingresa tu nombre");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Correo electronico no valido");
      return;
    }

    if (email.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(`Usa el mismo correo de la invitacion: ${invitation.email}`);
      return;
    }

    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
      setError(pwValidation.errors[0] ?? "Contrasena no valida");
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, fullName, "agency_register");
      setStep("needs_auth_login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear cuenta";
      setError(message || "Error al crear cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");

    if (!invitation) return;

    if (!isValidEmail(email)) {
      setError("Correo electronico no valido");
      return;
    }

    if (email.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(`Usa el mismo correo de la invitacion: ${invitation.email}`);
      return;
    }

    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
      setError(pwValidation.errors[0] ?? "Contrasena no valida");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de autenticacion";
      setError(message || "Error de autenticacion");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    setLoading(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("accept_invitation", {
        p_token: token,
      });

      if (rpcError) throw rpcError;

      await refreshProfile();
      setStep("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al aceptar invitacion";
      setError(message || "Error al aceptar invitacion");
    } finally {
      setLoading(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-text-muted">Verificando invitacion...</p>
        </div>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h1 className="mt-4 text-xl font-bold text-text">Invitacion no valida</h1>
        <p className="mt-2 text-center text-sm text-text-muted">
          Esta invitacion puede haber expirado, ya fue usada o el enlace es incorrecto.
        </p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Ir al inicio
        </Button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4">
        <CheckCircle className="h-12 w-12 text-primary" />
        <h1 className="mt-4 text-xl font-bold text-text">Bienvenido al equipo!</h1>
        <p className="mt-2 text-center text-sm text-text-muted">
          Has sido anadido a la agencia exitosamente.
        </p>
        <Button className="mt-6" onClick={() => navigate("/agency/dashboard")}>
          Ir al Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 w-full text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-text">Invitacion de Agencia</h1>
        <p className="mt-1 text-sm text-text-muted">
          {step === "needs_auth_login" && "Inicia sesion o crea una cuenta para aceptar"}
          {step === "needs_auth_register" && "Completa tu registro"}
          {step === "ready" && "Confirma tu ingreso al equipo"}
          {step === "error" && "Hay un problema con la invitacion"}
        </p>
      </div>

      {invitation && (
        <div className="mb-6 w-full rounded-xl bg-surface p-4 text-center">
          <p className="text-sm text-text-muted">Invitacion para</p>
          <p className="font-medium text-text">{invitation.email}</p>
          <p className="mt-1 text-xs text-text-muted">Rol: {invitation.role_name}</p>
        </div>
      )}

      {(step === "needs_auth_login" || step === "needs_auth_register") && (
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setStep("needs_auth_login")}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                step === "needs_auth_login" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-text"
              }`}
            >
              Iniciar Sesion
            </button>
            <button
              onClick={() => setStep("needs_auth_register")}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                step === "needs_auth_register" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-text"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {step === "needs_auth_register" && (
            <Input
              label="Nombre completo"
              placeholder="Tu nombre"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}

          <Input
            label="Correo electronico"
            type="email"
            placeholder={invitation?.email || "tu@correo.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Contrasena"
            type="password"
            placeholder="Minimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            size="lg"
            className="w-full"
            loading={loading}
            onClick={step === "needs_auth_register" ? handleCreateAccount : handleLogin}
          >
            {step === "needs_auth_register" ? "Crear Cuenta" : "Iniciar Sesion"}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-text-muted">o</span>
            </div>
          </div>

          <GoogleButton
            onClick={() => signInWithGoogle("agency_register")}
            loading={loading}
          />
        </div>
      )}

      {step === "ready" && (
        <div className="w-full space-y-4">
          <Button
            size="lg"
            className="w-full"
            loading={loading}
            onClick={handleAccept}
          >
            <CheckCircle className="h-5 w-5" />
            Aceptar Invitacion
          </Button>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      )}

      {step === "error" && error && (
        <div className="w-full space-y-4">
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Ir al inicio
          </Button>
        </div>
      )}
    </div>
  );
}
