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

  const rateCheck = await checkRateLimit(user.id, "create_role", {
    maxRequests: 10,
    windowSeconds: 300,
  });
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiadas solicitudes. Intenta mas tarde." }),
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
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (profile?.role_name !== "Agency_Admin") {
    return new Response(
      JSON.stringify({ error: "Solo el administrador puede crear roles" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: {
    role_name: string;
    can_manage_catalog: boolean;
    can_view_global_leads: boolean;
    can_manage_finance: boolean;
    can_manage_chat: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.role_name || body.role_name.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "role_name es requerido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const INAPPROPRIATE = ["admin", "superadmin", "root", "owner", "ceo", "sistema", "system"];
  const roleLower = body.role_name.toLowerCase().trim();
  for (const word of INAPPROPRIATE) {
    if (roleLower.includes(word)) {
      return new Response(
        JSON.stringify({ error: "Nombre de rol no permitido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const PLAN_LIMITS: Record<string, number> = { Gratuito: 0, Comercial: 1, Corporativo: 3 };

  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("subscription_tier")
    .eq("tenant_id", profile!.tenant_id!)
    .single();

  const maxRoles = PLAN_LIMITS[tenant?.subscription_tier ?? "Gratuito"] ?? 0;

  const { count } = await supabase
    .from("custom_roles_permissions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", profile!.tenant_id!);

  if ((count ?? 0) >= maxRoles) {
    return new Response(
      JSON.stringify({ error: `Limite alcanzado para plan ${tenant?.subscription_tier}` }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: newRole, error: insertError } = await supabase
    .from("custom_roles_permissions")
    .insert({
      tenant_id: profile!.tenant_id!,
      role_name: body.role_name.trim(),
      can_manage_catalog: body.can_manage_catalog ?? false,
      can_view_global_leads: body.can_view_global_leads ?? false,
      can_manage_finance: body.can_manage_finance ?? false,
      can_manage_chat: body.can_manage_chat ?? false,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return new Response(
        JSON.stringify({ error: "Ya existe un rol con ese nombre" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(newRole), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
