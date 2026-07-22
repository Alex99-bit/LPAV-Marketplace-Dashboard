import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
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

  const rateCheck = await checkRateLimit(user.id, "review_package", {
    maxRequests: 50,
    windowSeconds: 60,
  });
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiadas solicitudes" }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(rateCheck.retryAfter),
        },
      },
    );
  }

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_name")
    .eq("id", user.id)
    .single();

  if (profile?.role_name !== "SuperAdmin") {
    return new Response(
      JSON.stringify({ error: "Acceso restringido al SuperAdmin" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: { report_id: string; decision: "approve" | "ban"; notes?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.report_id || !body.decision || !["approve", "ban"].includes(body.decision)) {
    return new Response(
      JSON.stringify({ error: "report_id y decision ('approve' o 'ban') requeridos" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: report } = await supabase
    .from("package_reports")
    .select("package_id, reason")
    .eq("report_id", body.report_id)
    .eq("status", "pending")
    .single();

  if (!report) {
    return new Response(
      JSON.stringify({ error: "Reporte no encontrado o ya revisado" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

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

  const newStatus = body.decision === "approve" ? "published" : "archived";
  const reviewNotes = body.notes || (body.decision === "ban" ? "Baneado por contenido inapropiado" : null);

  await supabase
    .from("travel_packages")
    .update({ publication_status: newStatus })
    .eq("package_id", pkg.package_id);

  await supabase
    .from("package_reports")
    .update({ status: "reviewed", review_notes: reviewNotes })
    .eq("report_id", body.report_id);

  if (newStatus === "published") {
    const { data: existingPoints } = await supabase
      .from("points")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "review")
      .eq("description", `Reseña publicada: ${report.package_id}`)
      .maybeSingle();

    if (!existingPoints) {
      await supabase.rpc("credit_points", {
        p_user_id: user.id,
        p_points: 1,
        p_type: "review",
        p_description: `Reseña publicada: ${report.package_id}`,
        p_reference_order_id: null,
      });
    }
  }

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", pkg.tenant_id)
    .eq("role_name", "Agency_Admin");

  if (admins && admins.length > 0) {
    const isApproved = body.decision === "approve";
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: isApproved ? "package_approved" : "package_banned",
      title: isApproved ? "Paquete aprobado" : "Paquete baneado",
      message: isApproved
        ? `Tu paquete "${pkg.title}" fue aprobado y ya esta publicado.`
        : `Tu paquete "${pkg.title}" fue baneado.${reviewNotes ? ` Motivo: ${reviewNotes}` : ""}`,
      metadata: { package_title: pkg.title, decision: body.decision, notes: reviewNotes },
    }));
    await supabase.from("notifications").insert(notifications);
  }

  return new Response(
    JSON.stringify({ success: true, decision: body.decision }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
