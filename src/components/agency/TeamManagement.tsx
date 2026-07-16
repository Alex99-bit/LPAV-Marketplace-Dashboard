import { useState, useEffect } from "react";
import { UserPlus, Mail, MoreVertical } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { AgencyTeamMember } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

interface TeamManagementProps {
  tenantId: string;
}

export default function TeamManagement({ tenantId }: TeamManagementProps) {
  const [members, setMembers] = useState<AgencyTeamMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Agent");

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("agency_team_members")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("invited_at", { ascending: false });
    setMembers(data ?? []);
  };

  useEffect(() => {
    fetchMembers();
  }, [tenantId]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    await supabase.from("agency_team_members").insert({
      tenant_id: tenantId,
      email: inviteEmail,
      role_name: inviteRole,
      status: "invited",
    });
    setInviteEmail("");
    setShowInvite(false);
    fetchMembers();
  };

  const handleDeactivate = async (memberId: string) => {
    await supabase
      .from("agency_team_members")
      .update({ status: "deactivated" })
      .eq("member_id", memberId);
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
          />
          <Input
            label="Rol"
            placeholder="Agent"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          />
          <Button onClick={handleInvite} disabled={!inviteEmail}>
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
                    onClick={() => handleDeactivate(member.member_id)}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
