import { corsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

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

  // Parsear body
  let body: { package_id: string; reason: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.package_id || !body.reason) {
    return new Response(
      JSON.stringify({ error: "package_id y reason son requeridos" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Validar que el paquete existe y esta publicado
  const { data: pkg } = await supabase
    .from("travel_packages")
    .select("package_id, tenant_id, title")
    .eq("package_id", body.package_id)
    .eq("publication_status", "published")
    .single();

  if (!pkg) {
    return new Response(
      JSON.stringify({
        error: "Paquete no encontrado o no esta publicado",
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Evitar reportes duplicados del mismo usuario al mismo paquete
  const { data: existing } = await supabase
    .from("package_reports")
    .select("report_id")
    .eq("package_id", body.package_id)
    .eq("reporter_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ error: "Ya reportaste este paquete" }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Insertar el reporte
  const { data: report, error: reportError } = await supabase
    .from("package_reports")
    .insert({
      package_id: body.package_id,
      reporter_id: user.id,
      reason: body.reason,
    })
    .select()
    .single();

  if (reportError) {
    return new Response(JSON.stringify({ error: reportError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Cambiar estado del paquete a pending_review
  await supabase
    .from("travel_packages")
    .update({ publication_status: "pending_review" })
    .eq("package_id", body.package_id);

  // Notificar a los admins de la agencia dueña del paquete
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", pkg.tenant_id)
    .eq("role_name", "Agency_Admin");

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: "package_reported",
      title: "Paquete reportado",
      message:
        `Tu paquete "${pkg.title}" ha sido reportado por un viajero y esta en revision.`,
      metadata: {
        package_id: body.package_id,
        report_id: report.report_id,
        reason: body.reason,
      },
    }));

    await supabase.from("notifications").insert(notifications);
  }

  return new Response(
    JSON.stringify({ success: true, report_id: report.report_id }),
    {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
