import { useState, useRef } from "react";
import { FileText, Upload } from "lucide-react";
import type { AgencyTenant } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/Toast";

const FISCAL_BUCKET = "fiscal-documents";

interface FiscalDocumentsProps {
  tenant: AgencyTenant;
}

export default function FiscalDocuments({ tenant }: FiscalDocumentsProps) {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = `${tenant.tenant_id}/csf-${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(FISCAL_BUCKET)
        .upload(path, file);
      if (uploadError) throw uploadError;

      // TODO(security): fiscal-documents debe ser bucket privado con signed
      // URLs. Hoy usa getPublicUrl() → documentos sensibles accesibles sin
      // autenticación (ver plan maestro, riesgo de seguridad).

      const { data: publicUrl } = supabase.storage
        .from(FISCAL_BUCKET)
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("agencies_tenants")
        .update({ fiscal_pdf_url: publicUrl.publicUrl })
        .eq("tenant_id", tenant.tenant_id);
      if (updateError) throw updateError;

      addToast("success", "Documento fiscal actualizado", "La constancia se guardó correctamente.");
      // Recargar para que el padre refresque los datos del tenant
      window.location.reload();
    } catch (err) {
      console.error("Error al subir documento fiscal:", err);
      addToast("error", "No se pudo subir el documento", "Inténtalo de nuevo en unos segundos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Documentos Fiscales</h3>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-gray-50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text">RFC</p>
              <p className="text-xs text-text-muted">{tenant.rfc}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text">Constancia de Situación Fiscal</p>
              <p className="text-xs text-text-muted">
                {tenant.fiscal_pdf_url ? "Cargada" : "Pendiente"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant.fiscal_pdf_url && (
              <a
                href={tenant.fiscal_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors"
                aria-label="Ver constancia de situación fiscal"
              >
                <FileText className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg p-2 text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50"
              aria-label={uploading ? "Subiendo documento..." : "Subir constancia de situación fiscal"}
            >
              {uploading ? (
                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text">Dirección Fiscal</p>
              <p className="text-xs text-text-muted">{tenant.address_text || "No registrada"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
