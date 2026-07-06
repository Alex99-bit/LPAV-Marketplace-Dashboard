import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

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

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return new Response(
      JSON.stringify({ error: "Sin tenant asignado" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let hasCatalogPermission = false;
  if (profile.role_name === "Agency_Admin") {
    hasCatalogPermission = true;
  } else {
    const { data: rolePerm } = await supabase
      .from("custom_roles_permissions")
      .select("can_manage_catalog")
      .eq("tenant_id", profile.tenant_id)
      .eq("role_name", profile.role_name)
      .single();
    hasCatalogPermission = rolePerm?.can_manage_catalog === true;
  }

  if (!hasCatalogPermission) {
    return new Response(JSON.stringify({ error: "Permiso denegado" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { filename: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.filename) {
    return new Response(
      JSON.stringify({ error: "filename es requerido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const path = `${profile.tenant_id}/${body.filename}`;

  const { data, error } = await supabase.storage
    .from("flyers")
    .createSignedUploadUrl(path);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ signedUrl: data.signedUrl, path }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
