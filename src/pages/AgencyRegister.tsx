import { useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Upload, FileText, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AgencyRegister() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    business_name: "",
    rfc: "",
    address_text: "",
    certification_key: "",
    accept_terms: false,
  });

  const updateField = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    if (!form.business_name || !form.rfc || !form.address_text || !form.certification_key) {
      setError("Todos los campos son obligatorios");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("agencies_tenants")
        .insert({
          business_name: form.business_name,
          rfc: form.rfc.toUpperCase(),
          address_text: form.address_text,
          fiscal_pdf_url: "pending",
          certification_key: form.certification_key,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await refreshProfile();
      navigate("/agency/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <Building2 className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-text">
          Registra tu Agencia
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Completa los datos de tu agencia de viajes para comenzar a publicar
          paquetes.
        </p>
      </div>

      {!user && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="mb-3 text-sm text-text">
            Primero necesitas iniciar sesión
          </p>
          <Button onClick={signInWithGoogle}>
            Continuar con Google
          </Button>
        </div>
      )}

      {user && (
        <div className="space-y-6">
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
            onClick={handleSubmit}
          >
            <FileText className="h-5 w-5" />
            Registrar Agencia
          </Button>
        </div>
      )}
    </div>
  );
}
