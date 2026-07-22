import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Upload,
  FileText,
  CheckCircle,
  Shield,
  Brain,
  FileWarning,
  Crown,
  Store,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  LogIn,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { mapAuthError, mapSupabaseError } from "@/lib/errors";
import { PLAN_DETAILS } from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import GoogleButton from "@/components/auth/GoogleButton";
import {
  isValidEmail,
  isValidRFC,
  validatePassword,
  isValidCertificationKey,
} from "@/lib/validation";
import type { SubscriptionTier } from "@/types";

type Mode = "choice" | "agency_login" | "agency_register";
type RegisterStep = "business" | "plan" | "fiscal" | "legal" | "review";

/* Iconos de plan: solo datos visuales. La info de precios/límites/features
   vive en constants.ts como fuente única (PLAN_LIMITS + PLAN_DETAILS). */
const PLAN_ICONS: Record<SubscriptionTier, typeof Store> = {
  Gratuito: Store,
  Comercial: Briefcase,
  Corporativo: Crown,
};

export default function AgencyAuth() {
  const navigate = useNavigate();
  const {
    user,
    isAgency,
    loading: authLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    refreshProfile,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("choice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("business");

  // Redirect based on role if already logged in
  useEffect(() => {
    if (authLoading) return;
    if (user && isAgency) {
      navigate("/agency/dashboard", { replace: true });
    } else if (user && !isAgency && mode === "agency_login") {
      // Non-agency user tried to login via agency portal
      navigate("/", { replace: true });
    }
  }, [user, isAgency, authLoading, navigate, mode]);

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Agency registration fields
  const [form, setForm] = useState({
    business_name: "",
    rfc: "",
    address_text: "",
    certification_type: "",
    certification_key: "",
  });

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>("Comercial");

  // Fiscal document
  const [fiscalFile, setFiscalFile] = useState<File | null>(null);
  const [fiscalUploadUrl, setFiscalUploadUrl] = useState<string | null>(null);
  const [fiscalUploadProgress, setFiscalUploadProgress] = useState(false);
  const fiscalInputRef = useRef<HTMLInputElement>(null);

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Legal acceptances
  const [legal, setLegal] = useState({
    accept_no_refunds: false,
    accept_ai_data_usage: false,
    accept_nda: false,
  });

  const updateField = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateLegal = (field: keyof typeof legal) =>
    setLegal((prev) => ({ ...prev, [field]: !prev[field] }));

  // ── Auth handlers ──────────────────────────────────────────

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

    setLoading(true);
    try {
      if (mode === "agency_login") {
        await signInWithEmail(email, password);
        // Redirect will be handled by useEffect based on role
      } else {
        if (fullName.trim().length < 2) {
          setError("Ingresa tu nombre");
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, fullName, "agency_register");
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Logo upload ──────────────────────────────────

  const handleLogoFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/png") {
      setError("Solo se aceptan imágenes PNG");
      return;
    }

    setError("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth < 1024 || img.naturalHeight < 1024) {
          setError(
            "La imagen debe tener al menos 1024 x 1024 píxeles. Actual: " +
              img.naturalWidth +
              " x " +
              img.naturalHeight
          );
          setLogoFile(null);
          setLogoPreview(null);
          return;
        }
        setLogoFile(file);
        setLogoPreview(ev.target?.result as string);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // ── Fiscal document upload ──────────────────────────────────

  const handleFiscalFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Solo se aceptan archivos PDF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo no debe exceder 5 MB");
      return;
    }

    setError("");
    setFiscalFile(file);
    setFiscalUploadProgress(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `pending/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("fiscal-documents")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("fiscal-documents").getPublicUrl(filePath);

      setFiscalUploadUrl(publicUrl);
    } catch (err) {
      setError(mapSupabaseError(err));
      setFiscalFile(null);
    } finally {
      setFiscalUploadProgress(false);
    }
  };

  const removeFiscalFile = () => {
    setFiscalFile(null);
    setFiscalUploadUrl(null);
    if (fiscalInputRef.current) fiscalInputRef.current.value = "";
  };

  // ── Step validation ─────────────────────────────────────────

  const validateBusinessStep = (): boolean => {
    if (
      !form.business_name ||
      !form.rfc ||
      !form.address_text ||
      !form.certification_key
    ) {
      setError("Todos los campos son obligatorios");
      return false;
    }
    if (!isValidRFC(form.rfc)) {
      setError("RFC no válido (formato: XXXX000000XXX)");
      return false;
    }
    if (!isValidCertificationKey(form.certification_key)) {
      setError("Clave de certificación no válida");
      return false;
    }
    setError("");
    return true;
  };

  const validateFiscalStep = (): boolean => {
    if (!fiscalUploadUrl) {
      setError("Debes subir tu Constancia de Situación Fiscal");
      return false;
    }
    setError("");
    return true;
  };

  const validateLegalStep = (): boolean => {
    if (!legal.accept_no_refunds || !legal.accept_ai_data_usage || !legal.accept_nda) {
      setError("Debes aceptar los tres acuerdos legales para continuar");
      return false;
    }
    setError("");
    return true;
  };

  // ── Navigation between steps ────────────────────────────────

  const nextStep = () => {
    setError("");
    const steps: RegisterStep[] = ["business", "plan", "fiscal", "legal", "review"];
    const idx = steps.indexOf(registerStep);
    if (idx < steps.length - 1) setRegisterStep(steps[idx + 1]!);
  };

  const prevStep = () => {
    setError("");
    const steps: RegisterStep[] = ["business", "plan", "fiscal", "legal", "review"];
    const idx = steps.indexOf(registerStep);
    if (idx > 0) setRegisterStep(steps[idx - 1]!);
  };

  const canProceed = (): boolean => {
    switch (registerStep) {
      case "business":
        return validateBusinessStep();
      case "plan":
        return true;
      case "fiscal":
        return validateFiscalStep();
      case "legal":
        return validateLegalStep();
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceed()) nextStep();
  };

  // ── Final submit ────────────────────────────────────────────

  const handleRegisterAgency = async () => {
    setError("");

    // Final validation of all steps
    if (!validateBusinessStep()) {
      setRegisterStep("business");
      return;
    }
    if (!validateFiscalStep()) {
      setRegisterStep("fiscal");
      return;
    }
    if (!validateLegalStep()) {
      setRegisterStep("legal");
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("register_agency", {
        p_business_name: form.business_name,
        p_rfc: form.rfc,
        p_address_text: form.address_text,
        p_fiscal_pdf_url: fiscalUploadUrl,
        p_certification_key: form.certification_key,
        p_subscription_tier: selectedPlan,
        p_accept_no_refunds: legal.accept_no_refunds,
        p_accept_ai_data_usage: legal.accept_ai_data_usage,
        p_accept_nda: legal.accept_nda,
      });

      if (rpcError) throw rpcError;
      if (!data) throw new Error("No se pudo registrar la agencia");

      if (logoFile) {
        const logoExt = "png";
        const logoPath = `${data}/logo-${crypto.randomUUID()}.${logoExt}`;
        const { error: logoUploadError } = await supabase.storage
          .from("agency-logos")
          .upload(logoPath, logoFile, { contentType: "image/png" });
        if (logoUploadError) {
          console.warn("Logo upload failed:", logoUploadError);
        } else {
          const {
            data: { publicUrl: logoUrl },
          } = supabase.storage.from("agency-logos").getPublicUrl(logoPath);
          await supabase.rpc("update_agency_logo", {
            p_tenant_id: data,
            p_logo_url: logoUrl,
          });
        }
      }

      await refreshProfile();

      // Redirect to post-registration setup (Stripe Connect + Billing)
      navigate("/agency/post-register", {
        replace: true,
        state: { tenantId: data, plan: selectedPlan },
      });
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicators ─────────────────────────────────────────

  const STEPS: { key: RegisterStep; label: string }[] = [
    { key: "business", label: "Datos" },
    { key: "plan", label: "Plan" },
    { key: "fiscal", label: "Fiscal" },
    { key: "legal", label: "Legales" },
    { key: "review", label: "Revisión" },
  ];

  const currentStepIdx = STEPS.findIndex((s) => s.key === registerStep);

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i < currentStepIdx
                ? "bg-success text-white"
                : i === currentStepIdx
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-text-muted"
            }`}
          >
            {i < currentStepIdx ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              i + 1
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-1 h-0.5 w-6 sm:w-10 ${
                i < currentStepIdx ? "bg-success" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // ── Step: Business Info ─────────────────────────────────────

  const StepBusiness = () => (
    <div className="space-y-4">
      <Input
        label="Nombre comercial"
        placeholder="Ej: Viajes Increíbles S.A. de C.V."
        value={form.business_name}
        onChange={(e) => updateField("business_name", e.target.value)}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          Logotipo de la Agencia
        </label>
        {logoPreview ? (
          <div className="relative inline-block">
            <img
              src={logoPreview}
              alt="Logo preview"
              className="h-24 w-24 rounded-xl border border-gray-200 object-cover"
            />
            <button
              onClick={removeLogo}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => logoInputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Upload className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-1 text-xs text-text-muted">
              PNG, mínimo 1024 x 1024 píxeles
            </p>
          </button>
        )}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={handleLogoFileSelect}
        />
      </div>

      <Input
        label="RFC"
        placeholder="Ej: VIA123456789"
        value={form.rfc}
        onChange={(e) => updateField("rfc", e.target.value.toUpperCase())}
        maxLength={13}
      />
      {form.rfc.length > 0 &&
        (/^(?:[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}|[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3})$/.test(
          form.rfc
        ) ? (
          <p className="text-xs text-green-600">Formato de RFC válido</p>
        ) : (
          <p className="text-xs text-red-500">
            Formato de RFC inválido. Debe ser 12-13 caracteres para México.
          </p>
        ))}
      <Input
        label="Dirección fiscal completa"
        placeholder="Calle, número, colonia, ciudad, estado, CP"
        value={form.address_text}
        onChange={(e) => updateField("address_text", e.target.value)}
      />
      <Select
        label="Tipo de certificación"
        placeholder="Selecciona el tipo"
        options={[
          { value: "RNT", label: "RNT" },
          { value: "IATA", label: "IATA" },
          { value: "CLIA", label: "CLIA" },
          { value: "AMAV", label: "AMAV" },
          { value: "SECTUR", label: "SECTUR" },
          { value: "Otro", label: "Otro" },
        ]}
        value={form.certification_type}
        onChange={(e) => updateField("certification_type", e.target.value)}
      />
      <Input
        label="Clave de certificación turística"
        placeholder="Número de certificación oficial"
        value={form.certification_key}
        onChange={(e) => updateField("certification_key", e.target.value)}
      />
    </div>
  );

  // ── Step: Plan Selection ────────────────────────────────────

  const StepPlan = () => (
    <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <Briefcase className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text">
            Plan Comercial — Sin costo de suscripción
          </h3>
          <ul className="mt-3 space-y-1">
            {PLAN_DETAILS.Comercial.features.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 text-xs text-text-muted"
              >
                <CheckCircle className="h-3 w-3 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  // ── Step: Fiscal Document ───────────────────────────────────

  const StepFiscal = () => (
    <div className="space-y-4">
      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-medium">Constancia de Situación Fiscal</p>
        <p className="mt-1 text-xs text-blue-600">
          Documento digitalizado expedido por el SAT. Es indispensable para el
          timbrado automatizado de facturas fiscales (CFDI) a través de
          Facturama.
        </p>
      </div>

      {fiscalFile ? (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-surface p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-medium text-text">{fiscalFile.name}</p>
              <p className="text-xs text-text-muted">
                {(fiscalFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={removeFiscalFile}
            className="rounded-lg p-1 text-text-muted hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fiscalInputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
        >
          <Upload className="mx-auto h-10 w-10 text-text-muted" />
          <p className="mt-3 text-sm font-medium text-text">
            Subir Constancia de Situación Fiscal
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Archivo PDF, máximo 5 MB
          </p>
        </button>
      )}

      <input
        ref={fiscalInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFiscalFileSelect}
      />

      {fiscalUploadProgress && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Subiendo archivo...
        </div>
      )}
    </div>
  );

  // ── Step: Legal Acceptances ─────────────────────────────────

  const StepLegal = () => (
    <div className="space-y-4">
      {/* No Refunds */}
      <label
        className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-colors cursor-pointer ${
          legal.accept_no_refunds
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          type="checkbox"
          checked={legal.accept_no_refunds}
          onChange={() => updateLegal("accept_no_refunds")}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-text">
              Cláusula de No Reembolsos
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            La plataforma opera bajo una política estricta de no reembolsos.
            Cualquier pago realizado por servicios de suscripción o comisiones
            de plataforma no será reembolsado bajo ninguna circunstancia, salvo
            disposición legal aplicable.
          </p>
        </div>
      </label>

      {/* AI Data Usage */}
      <label
        className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-colors cursor-pointer ${
          legal.accept_ai_data_usage
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          type="checkbox"
          checked={legal.accept_ai_data_usage}
          onChange={() => updateLegal("accept_ai_data_usage")}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold text-text">
              Acuerdo de Uso de Datos para IA
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Autorizo que la información de usuarios y leads sea recabada y
            procesada para alimentar y optimizar el algoritmo predictivo de
            recomendación y personalización de itinerarios con inteligencia
            artificial de la plataforma.
          </p>
        </div>
      </label>

      {/* NDA */}
      <label
        className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-colors cursor-pointer ${
          legal.accept_nda
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          type="checkbox"
          checked={legal.accept_nda}
          onChange={() => updateLegal("accept_nda")}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-text">
              Convenio de Confidencialidad (NDA)
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Como política corporativa para resguardar la arquitectura
            multi-tenant y los secretos industriales (core de IA y algoritmos
            antidesintermediación), acepto firmar este instrumento legal ya sea
            físico o por firma digital antes de revelar cualquier endpoint o
            métrica del sistema.
          </p>
        </div>
      </label>
    </div>
  );

  // ── Step: Review & Submit ───────────────────────────────────

  const StepReview = () => {
    const plan = PLAN_DETAILS[selectedPlan];
    const Icon = PLAN_ICONS[selectedPlan];
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-surface p-4 space-y-3">
          <h3 className="font-semibold text-text">Datos de la Agencia</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-text-muted">Nombre:</span>
            <span className="text-text font-medium">{form.business_name}</span>
            <span className="text-text-muted">RFC:</span>
            <span className="text-text font-medium font-mono">{form.rfc}</span>
            <span className="text-text-muted">Dirección:</span>
            <span className="text-text font-medium">{form.address_text}</span>
          </div>
        </div>

        <div className="rounded-xl bg-surface p-4">
          <h3 className="font-semibold text-text">Plan Seleccionado</h3>
          <div className="mt-2 flex items-center gap-3">
            <Icon className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-text">{plan.label}</p>
              <p className="text-sm text-primary font-bold">{plan.price}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-surface p-4">
          <h3 className="font-semibold text-text">Documentación Fiscal</h3>
          <div className="mt-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm text-text">
              Constancia de Situación Fiscal: {fiscalFile?.name}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-surface p-4">
          <h3 className="font-semibold text-text">Acuerdos Legales</h3>
          <div className="mt-2 space-y-1">
            {legal.accept_no_refunds && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-success" />
                <span>Cláusula de No Reembolsos</span>
              </div>
            )}
            {legal.accept_ai_data_usage && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-success" />
                <span>Acuerdo de Uso de Datos para IA</span>
              </div>
            )}
            {legal.accept_nda && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-success" />
                <span>Convenio de Confidencialidad (NDA)</span>
              </div>
            )}
          </div>
        </div>

        {selectedPlan !== "Gratuito" && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">Siguiente paso después del registro</p>
            <p className="mt-1 text-xs text-amber-600">
              Serás redirigido a configurar tu cuenta de cobro (Stripe Connect
              Express) y datos de facturación de suscripción (Stripe Billing).
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Choice screen ───────────────────────────────────

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
          className="mt-6 inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </button>
      </div>
    );
  }

  // ── Render: Login / Register (auth + agency form) ───────────

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 w-full text-center">
        <button
          onClick={() => {
            setMode("choice");
            setRegisterStep("business");
            setError("");
          }}
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-text">
          {mode === "agency_login"
            ? "Iniciar Sesión - Agencia"
            : user
              ? "Registro de Agencia"
              : "Crear Cuenta de Agencia"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {mode === "agency_login"
            ? "Accede con tu cuenta de agencia"
            : user
              ? "Completa los datos para registrar tu agencia"
              : "Primero crea tu cuenta y luego registra tu agencia"}
        </p>
      </div>

      {/* Auth form (email/password) */}
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
            {mode === "agency_login" ? (
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
            onClick={() => signInWithGoogle("agency_login")}
            loading={loading}
          />

          <p className="text-center text-sm text-text-muted">
            {mode === "agency_login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button
              onClick={() =>
                setMode(
                  mode === "agency_login" ? "agency_register" : "agency_login"
                )
              }
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {mode === "agency_login" ? (
                <><Building2 className="h-3.5 w-3.5" /> Registra tu agencia</>
              ) : (
                <><LogIn className="h-3.5 w-3.5" /> Inicia sesión</>
              )}
            </button>
          </p>
        </div>
      )}

      {/* Multi-step registration form */}
      {user && mode === "agency_register" && (
        <div className="w-full space-y-5">
          {/* Connected account badge */}
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

          {/* TODO(F2-agencyauth-extraction): extraer StepIndicator, StepBusiness,
              StepPlan, StepFiscal, StepLegal y StepReview a AgencyWizardSteps.tsx
              con props tipadas. Depende de FormField (errores por campo) y Alert
              (info boxes) — ver primitivos creados en Fase 1. Por ahora se
              renderizan como llamadas a función ({StepBusiness()}) en vez de JSX
              para evitar el bug de pérdida de foco. */}
          {StepIndicator()}

          {/* Step content */}
          {registerStep === "business" && StepBusiness()}
          {registerStep === "plan" && StepPlan()}
          {registerStep === "fiscal" && StepFiscal()}
          {registerStep === "legal" && StepLegal()}
          {registerStep === "review" && StepReview()}

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStepIdx > 0 && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={prevStep}
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
            )}

            {registerStep !== "review" ? (
              <Button
                size="lg"
                className="flex-1"
                onClick={handleNext}
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1"
                loading={loading}
                onClick={handleRegisterAgency}
              >
                <FileText className="h-5 w-5" />
                Registrar Agencia
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
