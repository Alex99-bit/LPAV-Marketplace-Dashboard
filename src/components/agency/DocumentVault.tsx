import { FileText, Download } from "lucide-react";
import type { TravelerDocument } from "@/types";

interface DocumentVaultProps {
  documents: TravelerDocument[];
  orderId: string;
}

export default function DocumentVault({ documents }: DocumentVaultProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-semibold text-text">Documentos de Viajeros</h3>
        <p className="mt-4 text-sm text-text-muted text-center py-8">
          No hay documentos cargados.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Documentos de Viajeros</h3>
      <div className="mt-4 space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.document_id}
            className="flex items-center justify-between rounded-xl border border-gray-50 p-3"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text">{doc.file_name}</p>
                <p className="text-xs text-text-muted">{doc.document_type}</p>
              </div>
            </div>
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
