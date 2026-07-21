import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, Shield, Trash2, LayoutDashboard } from "lucide-react";
import type { CustomRolePermission } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { PLAN_LIMITS } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Switch from "@/components/ui/Switch";
import { validateRoleName } from "@/lib/validation";

export default function AgencyRoles() {
  const { profile } = useAuth();
  const [roles, setRoles] = useState<CustomRolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingRole, setDeletingRole] = useState<CustomRolePermission | null>(null);

  const [form, setForm] = useState({
    role_name: "",
    can_manage_catalog: false,
    can_view_global_leads: false,
    can_manage_finance: false,
    can_manage_chat: false,
  });

  const planLimit =
    PLAN_LIMITS[
      (profile as unknown as { subscription_tier?: string })
        ?.subscription_tier as keyof typeof PLAN_LIMITS
    ] ?? PLAN_LIMITS.Gratuito;

  const fetchRoles = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase
      .from("custom_roles_permissions")
      .select("*")
      .eq("tenant_id", profile.tenant_id!)
      .order("created_at", { ascending: true });
    setRoles(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, [profile?.tenant_id]);

  const handleCreate = async () => {
    setError("");
    const validation = validateRoleName(form.role_name);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase
      .from("custom_roles_permissions")
      .insert({
        tenant_id: profile!.tenant_id!,
        role_name: form.role_name.trim(),
        can_manage_catalog: form.can_manage_catalog,
        can_view_global_leads: form.can_view_global_leads,
        can_manage_finance: form.can_manage_finance,
        can_manage_chat: form.can_manage_chat,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Ya existe un rol con ese nombre");
      } else {
        setError(insertError.message);
      }
    } else {
      setShowForm(false);
      setForm({
        role_name: "",
        can_manage_catalog: false,
        can_view_global_leads: false,
        can_manage_finance: false,
        can_manage_chat: false,
      });
      fetchRoles();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    await supabase
      .from("custom_roles_permissions")
      .delete()
      .eq("role_id", deletingRole.role_id);
    setDeletingRole(null);
    fetchRoles();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Roles y Permisos</h1>
          <p className="mt-1 text-sm text-text-muted">
            {roles.length} / {planLimit.maxCustomRoles} roles personalizados
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/agency/dashboard">
            <Button variant="outline" size="sm"><LayoutDashboard className="h-4 w-4" /> Dashboard</Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            disabled={roles.length >= planLimit.maxCustomRoles}
          >
            <Plus className="h-4 w-4" /> Nuevo Rol
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {roles.map((role) => (
          <div
            key={role.role_id}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-text">{role.role_name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {role.can_manage_catalog && (
                    <Badge variant="info">Catálogo</Badge>
                  )}
                  {role.can_view_global_leads && (
                    <Badge variant="success">Leads</Badge>
                  )}
                  {role.can_manage_finance && (
                    <Badge variant="warning">Finanzas</Badge>
                  )}
                  {role.can_manage_chat && (
                    <Badge variant="default">Chat</Badge>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setDeletingRole(role)}
              className="rounded-lg p-2 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
              aria-label={`Eliminar rol ${role.role_name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Shield className="h-10 w-10 text-text-muted/50" />
          <p className="text-sm text-text-muted">
            No tienes roles personalizados. Crea uno para asignar permisos a tus
            colaboradores.
          </p>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setError("");
        }}
        title="Nuevo Rol"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del rol"
            placeholder="Ej: Agente de Ventas"
            value={form.role_name}
            onChange={(e) => setForm({ ...form, role_name: e.target.value })}
            error={error}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium text-text">Permisos</p>
            <Switch
              label="Gestionar catálogo (crear/editar flyers)"
              checked={form.can_manage_catalog}
              onChange={(c) => setForm({ ...form, can_manage_catalog: c })}
            />
            <Switch
              label="Ver todos los leads de la agencia"
              checked={form.can_view_global_leads}
              onChange={(c) => setForm({ ...form, can_view_global_leads: c })}
            />
            <Switch
              label="Gestionar finanzas (ver órdenes)"
              checked={form.can_manage_finance}
              onChange={(c) => setForm({ ...form, can_manage_finance: c })}
            />
            <Switch
              label="Gestionar chat (responder mensajes)"
              checked={form.can_manage_chat}
              onChange={(c) => setForm({ ...form, can_manage_chat: c })}
            />
          </div>
          <Button
            className="w-full"
            loading={saving}
            onClick={handleCreate}
            disabled={!form.role_name.trim()}
          >
            Crear Rol
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deletingRole !== null}
        onClose={() => setDeletingRole(null)}
        title="Eliminar rol"
        description={
          deletingRole
            ? `¿Estás seguro de que quieres eliminar el rol "${deletingRole.role_name}"? Los colaboradores que lo tengan asignado perderán sus permisos.`
            : undefined
        }
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
