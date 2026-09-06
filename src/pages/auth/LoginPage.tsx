import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Plane, Building2, Eye, EyeOff, ArrowLeft, LogIn, UserPlus, Mail, HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import GoogleButton from "@/components/auth/GoogleButton";
import { mapAuthError } from "@/lib/errors";
import { isValidEmail, validatePassword } from "@/lib/validation";

type Mode = "choice" | "traveler_login" | "traveler_register" | "forgot_password";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAgency, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("choice");
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Destino original del viajero antes de que el AuthGuard lo mandara a login
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;

  // Redirect based on role when user is already logged in
  useEffect(() => {
    if (loading) return;
    if (user) {
      if (isAgency) {
        // Regla PRD §2.3: las agencias siempre van directo a su dashboard
        navigate("/agency/dashboard", { replace: true });
      } else {
        const dest = from?.pathname
          ? `${from.pathname}${from.search ?? ""}`
          : "/";
        navigate(dest, { replace: true });
      }
    }
  }, [user, isAgency, loading, navigate, from]);

  // Spinner mientras se verifica la sesión o se redirige tras login
  if (loading || user) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleEmailAuth = async () => {
    setError("");

    if (!isValidEmail(email)) {
      setError("Correo electrónico no válido");
      return;
    }

    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
      setError(pwValidation.errors[0] ?? "Contraseña no válida");
      return;
    }

    setAuthLoading(true);
    try {
      if (mode === "traveler_login") {
        await signInWithEmail(email, password);
      } else {
        if (fullName.trim().length < 2) {
          setError("Ingresa tu nombre");
          setAuthLoading(false);
          return;
        }
        await signUpWithEmail(email, password, fullName, "traveler_register");
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    if (!isValidEmail(email)) {
      setError("Correo electrónico no válido");
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/login`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  if (mode === "choice") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text">Bienvenido a Avimo</h1>
          <p className="mt-2 text-text-muted">
            ¿Cómo quieres usar la plataforma?
          </p>
        </div>

        <div className="grid w-full gap-4">
          <button
            onClick={() => setMode("traveler_login")}
            className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Plane className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">
                Soy Viajero
              </h3>
              <p className="text-sm text-text-muted">
                Explorar paquetes, reservar viajes y generar itinerarios con IA
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate("/auth/agency")}
            className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">
                Soy Agencia
              </h3>
              <p className="text-sm text-text-muted">
                Publicar paquetes, gestionar leads y administrar mi equipo
              </p>
            </div>
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          ¿Eres empleado de una agencia? Pide tu enlace de invitación a tu
          administrador.
        </p>
      </div>
    );
  }

  // Forgot password flow — independiente del login/registro
  if (mode === "forgot_password") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4">
        <div className="mb-6 w-full text-center">
            <button
              onClick={() => { setMode("traveler_login"); setResetSent(false); }}
              className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesión
          </button>
          <h1 className="text-2xl font-bold text-text">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-text-muted">
            {resetSent
              ? "Revisa tu correo electrónico para restablecer tu contraseña."
              : "Ingresa tu correo y te enviaremos un enlace de recuperación."}
          </p>
        </div>
        {!resetSent && (
          <div className="w-full space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              loading={authLoading}
              onClick={handleForgotPassword}
            >
              <Mail className="h-4 w-4" />
              Enviar enlace de recuperación
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4">
      <div className="mb-6 w-full text-center">
          <button
            onClick={() => setMode("choice")}
            className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Plane className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-text">
          {mode === "traveler_login" ? "Iniciar Sesión" : "Crear Cuenta"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {mode === "traveler_login"
            ? "Accede a tu cuenta de viajero"
            : "Regístrate para reservar viajes y usar IA"}
        </p>
      </div>

      <div className="w-full space-y-4">
        {mode === "traveler_register" && (
          <Input
            label="Nombre completo"
            placeholder="Tu nombre"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}

        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <Input
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] rounded-lg p-1 text-text-muted hover:text-text"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {mode === "traveler_login" && (
          <button
            onClick={() => { setMode("forgot_password"); setError(""); setResetSent(false); }}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          loading={authLoading}
          onClick={handleEmailAuth}
        >
          {mode === "traveler_login" ? (
            <><LogIn className="h-4 w-4" /> Iniciar Sesión</>
          ) : (
            <><UserPlus className="h-4 w-4" /> Crear Cuenta</>
          )}
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
          onClick={() => signInWithGoogle("traveler_login")}
          loading={authLoading}
        />

        <p className="text-center text-sm text-text-muted">
          {mode === "traveler_login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button
            onClick={() =>
              setMode(
                mode === "traveler_login"
                  ? "traveler_register"
                  : "traveler_login"
              )
            }
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {mode === "traveler_login" ? (
              <><UserPlus className="h-3.5 w-3.5" /> Regístrate</>
            ) : (
              <><LogIn className="h-3.5 w-3.5" /> Inicia sesión</>
            )}
          </button>
        </p>
      </div>
    </div>
  );
}
