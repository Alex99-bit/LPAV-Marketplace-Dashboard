import { FileText, Upload } from "lucide-react";
import type { AgencyTenant } from "@/types";

interface FiscalDocumentsProps {
  tenant: AgencyTenant;
}

export default function FiscalDocuments({ tenant }: FiscalDocumentsProps) {
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
          {!tenant.fiscal_pdf_url && (
            <button className="rounded-lg p-2 text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors">
              <Upload className="h-4 w-4" />
            </button>
          )}
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
