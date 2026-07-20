import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AgencyTenant } from "@/types";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface CompanyProfileFormProps {
  tenant: AgencyTenant;
  onSave: () => void;
}

export default function CompanyProfileForm({ tenant, onSave }: CompanyProfileFormProps) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    business_name: tenant.business_name,
    contact_email: (tenant as unknown as { contact_email?: string }).contact_email ?? "",
    contact_phone: (tenant as unknown as { contact_phone?: string }).contact_phone ?? "",
    website_url: (tenant as unknown as { website_url?: string }).website_url ?? "",
    description: (tenant as unknown as { description?: string }).description ?? "",
    timezone: (tenant as unknown as { timezone?: string }).timezone ?? "America/Mexico_City",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("agencies_tenants")
      .update(form)
      .eq("tenant_id", tenant.tenant_id);
    setSaving(false);
    if (error) {
      addToast("error", "Error al guardar", error.message);
    } else {
      addToast("success", "Perfil guardado");
      onSave();
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-lg font-semibold text-text">Perfil de Empresa</h3>
      <div className="mt-4 space-y-4">
        <Input
          label="Nombre Comercial"
          value={form.business_name}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email de Contacto"
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
          <Input
            label="Teléfono"
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          />
        </div>
        <Input
          label="Sitio Web"
          placeholder="https://..."
          value={form.website_url}
          onChange={(e) => setForm({ ...form, website_url: e.target.value })}
        />
        <Input
          label="Descripción"
          placeholder="Describe tu agencia..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button onClick={handleSave} loading={saving}>
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
