import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface CfdiInvoicesProps {
  tenantId: string;
}

export default function CfdiInvoices({ tenantId }: CfdiInvoicesProps) {
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ pdf_url: string; xml_url: string } | null>(null);
  const { addToast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cfdi", {
        body: { concept, amount: Number(amount), tenant_id: tenantId },
      });
      if (error) throw error;
      setResult(data);
      addToast("success", "CFDI generado", "Puedes descargar el PDF y XML abajo.");
    } catch (err) {
      console.error(err);
      addToast("error", "No se pudo generar el CFDI", "Verifica los datos e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Facturas CFDI</h3>
      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Concepto"
            placeholder="Comisión plataforma LPAV"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
          <Input
            label="Monto"
            type="number"
            placeholder="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button onClick={handleGenerate} loading={loading} disabled={!concept || !amount}>
          <FileText className="h-4 w-4" />
          Generar CFDI
        </Button>

        {result && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
            <p className="text-sm font-medium text-emerald-800">CFDI generado exitosamente</p>
            <div className="flex gap-3">
              <a
                href={result.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </a>
              <a
                href={result.xml_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> XML
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
