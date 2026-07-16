import { useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";

interface RoomingListExporterProps {
  orderId: string;
  orderTitle: string;
}

export default function RoomingListExporter({ orderId, orderTitle }: RoomingListExporterProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data: travelers } = await supabase
        .from("transactions_orders")
        .select("user_id, profiles(full_name, email, phone)")
        .eq("order_id", orderId)
        .single();

      const csvContent = [
        "Nombre,Email,Teléfono,Habitación",
        `${(travelers?.profiles as unknown as { full_name: string; email: string; phone: string } | null)?.full_name ?? "Viajero"},${(travelers?.profiles as unknown as { full_name: string; email: string; phone: string } | null)?.email ?? ""},${(travelers?.profiles as unknown as { full_name: string; email: string; phone: string } | null)?.phone ?? ""},TBD`,
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rooming_${orderTitle.replace(/\s+/g, "_")}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      if (profile?.id) {
        await supabase.from("rooming_lists").insert({
          order_id: orderId,
          generated_by: profile.id,
          file_url: url,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} loading={loading}>
      <Download className="h-4 w-4" />
      Generar Rooming List
    </Button>
  );
}
