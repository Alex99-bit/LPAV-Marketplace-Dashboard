import { corsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

async function notifyAdmins(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  packageTitle: string,
  decision: "approved" | "banned",
  notes?: string,
) {
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role_name", "Agency_Admin");

  if (!admins || admins.length === 0) return;

  const isApproved = decision === "approved";

  const notifications = admins.map((admin) => ({
    user_id: admin.id,
    type: isApproved ? "package_approved" : "package_banned",
    title: isApproved ? "Paquete aprobado" : "Paquete baneado",
    message: isApproved
      ? `Tu paquete "${packageTitle}" fue revisado y aprobado. Ya esta visible en el marketplace.`
      : `Tu paquete "${packageTitle}" ha sido baneado por contenido inapropiado.${
        notes ? ` Motivo: ${notes}` : ""
      }`,
    metadata: { package_title: packageTitle, decision, notes },
  }));

  await supabase.from("notifications").insert(notifications);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  // Verificar rol de SuperAdmin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role_name")
    .eq("id", user.id)
    .single();

  if (profile?.role_name !== "SuperAdmin") {
    return new Response(
      JSON.stringify({ error: "Acceso restringido al SuperAdmin" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Parsear body
  let body: {
    report_id: string;
    decision: "approve" | "ban";
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (
    !body.report_id || !body.decision ||
    !["approve", "ban"].includes(body.decision)
  ) {
    return new Response(
      JSON.stringify({
        error: "report_id y decision ('approve' o 'ban') son requeridos",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Obtener el reporte pendiente
  const { data: report } = await supabase
    .from("package_reports")
    .select("package_id, reason")
    .eq("report_id", body.report_id)
    .eq("status", "pending")
    .single();

  if (!report) {
    return new Response(
      JSON.stringify({
        error: "Reporte no encontrado o ya fue revisado",
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Obtener el paquete y su tenant
  const { data: pkg } = await supabase
    .from("travel_packages")
    .select("package_id, tenant_id, title")
    .eq("package_id", report.package_id)
    .single();

  if (!pkg) {
    return new Response(JSON.stringify({ error: "Paquete no encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reviewNotes = body.notes || null;

  if (body.decision === "approve") {
    // Aprobar: restaurar paquete a published
    await supabase
      .from("travel_packages")
      .update({ publication_status: "published" })
      .eq("package_id", pkg.package_id);

    // Actualizar reporte
    await supabase
      .from("package_reports")
      .update({ status: "reviewed", review_notes: reviewNotes })
      .eq("report_id", body.report_id);

    await notifyAdmins(supabase, pkg.tenant_id, pkg.title, "approved", reviewNotes);
  } else {
    // Banear: archivar paquete permanentemente
    await supabase
      .from("travel_packages")
      .update({ publication_status: "archived" })
      .eq("package_id", pkg.package_id);

    // Actualizar reporte con notas del baneo
    await supabase
      .from("package_reports")
      .update({
        status: "reviewed",
        review_notes: reviewNotes || "Paquete baneado por contenido inapropiado",
      })
      .eq("report_id", body.report_id);

    await notifyAdmins(supabase, pkg.tenant_id, pkg.title, "banned", reviewNotes);
  }

  return new Response(
    JSON.stringify({ success: true, decision: body.decision }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
