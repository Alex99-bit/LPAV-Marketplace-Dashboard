import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Upload,
  FileText,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "@/components/auth/GoogleButton";
import {
  isValidEmail,
  isValidRFC,
  validatePassword,
  isValidCertificationKey,
} from "@/lib/validation";

type Mode = "choice" | "agency_login" | "agency_register";

export default function AgencyAuth() {
  const navigate = useNavigate();
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, refreshProfile } =
    useAuth();
  const [mode, setMode] = useState<Mode>("choice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [form, setForm] = useState({
    business_name: "",
    rfc: "",
    address_text: "",
    certification_key: "",
    accept_terms: false,
  });

  const updateField = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleEmailAuth = async () => {
    setError("");

    if (!isValidEmail(email)) {
      setError("Correo electrónico no válido");
      return;
    }

    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
      setError(pwValidation.errors[0] ?? "Contrasena no valida");
      return;
    }

    setLoading(true);
    try {
      if (mode === "agency_login") {
        await signInWithEmail(email, password);
      } else {
        if (fullName.trim().length < 2) {
          setError("Ingresa tu nombre");
          return;
        }
        await signUpWithEmail(email, password, fullName, "agency_register");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de autenticación";
      setError(message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAgency = async () => {
    setError("");

    if (!form.business_name || !form.rfc || !form.address_text || !form.certification_key) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (!isValidRFC(form.rfc)) {
      setError("RFC no válido");
      return;
    }

    if (!isValidCertificationKey(form.certification_key)) {
      setError("Clave de certificación no válida");
      return;
    }

    if (!form.accept_terms) {
      setError("Debes aceptar los términos y condiciones");
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("register_agency", {
        p_business_name: form.business_name,
        p_rfc: form.rfc,
        p_address_text: form.address_text,
        p_fiscal_pdf_url: "pending",
        p_certification_key: form.certification_key,
      });

      if (rpcError) throw rpcError;
      if (!data) throw new Error("No se pudo registrar la agencia");

      await refreshProfile();
      navigate("/agency/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar";
      setError(message || "Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "choice") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center px-4">
        <div className="mb-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-text">Portal de Agencias</h1>
          <p className="mt-2 text-text-muted">
            Gestiona tu agencia de viajes en la plataforma
          </p>
        </div>

        <div className="grid w-full gap-4">
          <button
            onClick={() => setMode("agency_login")}
            className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <CheckCircle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">
                Iniciar Sesión
              </h3>
              <p className="text-sm text-text-muted">
                Ya tengo una cuenta de agencia registrada
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode("agency_register")}
            className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">
                Registrar mi Agencia
              </h3>
              <p className="text-sm text-text-muted">
                Crear una nueva cuenta de agencia de viajes
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={() => navigate("/auth/login")}
          className="mt-6 text-sm text-text-muted hover:text-primary"
        >
          &larr; Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 w-full text-center">
        <button
          onClick={() => setMode("choice")}
          className="mb-4 text-sm text-text-muted hover:text-primary"
        >
          &larr; Volver
        </button>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-text">
          {mode === "agency_login"
            ? "Iniciar Sesión - Agencia"
            : user
              ? "Datos de tu Agencia"
              : "Crear Cuenta de Agencia"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {mode === "agency_login"
            ? "Accede con tu cuenta de agencia"
            : user
              ? "Completa los datos de tu agencia de viajes"
              : "Primero crea tu cuenta y luego registra tu agencia"}
        </p>
      </div>

      {!user && (
        <div className="w-full space-y-4">
          {mode === "agency_register" && (
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
            placeholder="tu@agencia.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
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
            onClick={handleEmailAuth}
          >
            {mode === "agency_login" ? "Iniciar Sesión" : "Crear Cuenta"}
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
            onClick={() => signInWithGoogle("agency_login")}
            loading={loading}
          />

          <p className="text-center text-sm text-text-muted">
            {mode === "agency_login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button
              onClick={() =>
                setMode(mode === "agency_login" ? "agency_register" : "agency_login")
              }
              className="font-medium text-primary hover:underline"
            >
              {mode === "agency_login" ? "Registra tu agencia" : "Inicia sesión"}
            </button>
          </p>
        </div>
      )}

      {user && mode === "agency_register" && (
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between rounded-xl bg-surface p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{user.email}</p>
                <p className="text-xs text-text-muted">Cuenta conectada</p>
              </div>
            </div>
            <CheckCircle className="h-5 w-5 text-success" />
          </div>

          <div className="space-y-4">
            <Input
              label="Nombre comercial"
              placeholder="Ej: Viajes Increíbles S.A. de C.V."
              value={form.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
            />
            <Input
              label="RFC"
              placeholder="Ej: VIA123456789"
              value={form.rfc}
              onChange={(e) => updateField("rfc", e.target.value.toUpperCase())}
              maxLength={13}
            />
            <Input
              label="Dirección física"
              placeholder="Calle, número, colonia, ciudad, estado, CP"
              value={form.address_text}
              onChange={(e) => updateField("address_text", e.target.value)}
            />
            <Input
              label="Clave de certificación turística"
              placeholder="Número de certificación oficial"
              value={form.certification_key}
              onChange={(e) => updateField("certification_key", e.target.value)}
            />

            <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-2 text-sm font-medium text-text">
                Constancia de Situación Fiscal (PDF)
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Se cargará mediante URL firmada (próximamente)
              </p>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.accept_terms}
                onChange={(e) => updateField("accept_terms", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-muted">
                Acepto los{" "}
                <a href="#" className="text-primary hover:underline">
                  Términos y Condiciones
                </a>{" "}
                y el{" "}
                <a href="#" className="text-primary hover:underline">
                  Aviso de Privacidad
                </a>{" "}
                de LPAV.
              </span>
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            size="lg"
            className="w-full"
            loading={loading}
            disabled={!form.accept_terms}
            onClick={handleRegisterAgency}
          >
            <FileText className="h-5 w-5" />
            Registrar Agencia
          </Button>
        </div>
      )}
    </div>
  );
}
