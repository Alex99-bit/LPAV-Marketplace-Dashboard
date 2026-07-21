import { useState, useEffect } from "react";
import { UserPlus, Mail, UserX } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { AgencyTeamMember, CustomRolePermission } from "@/types";
import { isValidEmail } from "@/lib/validation";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface TeamManagementProps {
  tenantId: string;
}

export default function TeamManagement({ tenantId }: TeamManagementProps) {
  const [members, setMembers] = useState<AgencyTeamMember[]>([]);
  const [roles, setRoles] = useState<CustomRolePermission[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [deactivatingMember, setDeactivatingMember] = useState<AgencyTeamMember | null>(null);
  const [inviteError, setInviteError] = useState("");
  const { addToast } = useToast();

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("agency_team_members")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("invited_at", { ascending: false });
    setMembers(data ?? []);
  };

  const fetchRoles = async () => {
    const { data } = await supabase
      .from("custom_roles_permissions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    setRoles(data ?? []);
    if (data && data.length > 0 && !inviteRole) {
      setInviteRole(data[0]!.role_id);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleInvite = async () => {
    setInviteError("");
    if (!inviteEmail) return;
    if (!isValidEmail(inviteEmail)) {
      setInviteError("Correo electrónico no válido");
      return;
    }
    if (!inviteRole) {
      setInviteError("Selecciona un rol");
      return;
    }
    const selectedRole = roles.find((r) => r.role_id === inviteRole);
    const { error } = await supabase.from("agency_team_members").insert({
      tenant_id: tenantId,
      email: inviteEmail,
      role_name: selectedRole?.role_name ?? "",
      role_id: inviteRole,
      status: "invited",
    });
    if (error) {
      addToast("error", "No se pudo enviar la invitación", error.message);
      return;
    }
    addToast("success", "Invitación enviada", `Se invitó a ${inviteEmail}.`);
    // TODO(F4-team-email): implementar envío de email real vía edge function
    // cuando el backend de notificaciones esté listo.
    setInviteEmail("");
    setShowInvite(false);
    fetchMembers();
  };

  const handleDeactivate = async () => {
    if (!deactivatingMember) return;
    await supabase
      .from("agency_team_members")
      .update({ status: "deactivated" })
      .eq("member_id", deactivatingMember.member_id);
    setDeactivatingMember(null);
    fetchMembers();
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Equipo</h3>
        <Button size="sm" variant="outline" onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4" /> Invitar
        </Button>
      </div>

      {showInvite && (
        <div className="mt-4 rounded-xl border border-gray-100 p-4 space-y-3">
          <Input
            label="Email"
            type="email"
            placeholder="agente@agencia.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            error={inviteError}
          />
          {roles.length > 0 ? (
            <Select
              label="Rol"
              options={roles.map((r) => ({ value: r.role_id, label: r.role_name }))}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              placeholder="Selecciona un rol"
            />
          ) : (
            <p className="text-sm text-text-muted">
              No hay roles disponibles. Crea uno en Roles y Permisos.
            </p>
          )}
          <Button onClick={handleInvite} disabled={!inviteEmail || !inviteRole}>
            <Mail className="h-4 w-4" /> Enviar Invitación
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No hay miembros en el equipo.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.member_id}
              className="flex items-center justify-between rounded-xl border border-gray-50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-text">
                  {member.full_name?.charAt(0)?.toUpperCase() ?? member.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-text">
                    {member.full_name ?? member.email}
                  </p>
                  <p className="text-xs text-text-muted">{member.role_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={member.status === "active" ? "success" : member.status === "invited" ? "warning" : "default"}
                >
                  {member.status === "active" ? "Activo" : member.status === "invited" ? "Invitado" : "Desactivado"}
                </Badge>
                {member.status !== "deactivated" && (
                  <button
                    onClick={() => setDeactivatingMember(member)}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label={`Desactivar a ${member.full_name ?? member.email}`}
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deactivatingMember !== null}
        onClose={() => setDeactivatingMember(null)}
        title="Desactivar miembro del equipo"
        description={
          deactivatingMember
            ? `¿Estás seguro de que quieres desactivar a "${deactivatingMember.full_name ?? deactivatingMember.email}"? Perderá acceso al panel de la agencia.`
            : undefined
        }
        confirmLabel="Desactivar"
        variant="danger"
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
