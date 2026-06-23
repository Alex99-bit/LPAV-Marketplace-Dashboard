import { corsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

// Palabras inapropiadas para validar role_name
const INAPPROPRIATE_WORDS = [
  "admin",
  "superadmin",
  "root",
  "owner",
  "ceo",
  "sistema",
  "system",
  "ofensivo",
  "insulto",
];

const PLAN_LIMITS: Record<string, number> = {
  "Gratuito": 0,
  "Comercial": 1,
  "Corporativo": 3,
};

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

  // Validar que sea Agency_Admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: "Perfil no encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (profile.role_name !== "Agency_Admin") {
    return new Response(
      JSON.stringify({ error: "Solo el administrador puede crear roles" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Parsear body
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
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Validar que el nombre no contenga palabras inapropiadas
  const roleLower = body.role_name.toLowerCase().trim();
  for (const word of INAPPROPRIATE_WORDS) {
    if (roleLower.includes(word)) {
      return new Response(
        JSON.stringify({ error: "El nombre del rol contiene palabras no permitidas" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // Obtener subscription_tier del tenant y contar roles existentes
  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("subscription_tier")
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!tenant) {
    return new Response(JSON.stringify({ error: "Agencia no encontrada" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { count: currentRoles } = await supabase
    .from("custom_roles_permissions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id);

  const maxRoles = PLAN_LIMITS[tenant.subscription_tier] ?? 0;
  if ((currentRoles ?? 0) >= maxRoles) {
    return new Response(
      JSON.stringify({
        error: `Limite de roles alcanzado para el plan ${tenant.subscription_tier}. Maximo: ${maxRoles} rol(es) personalizado(s).`,
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Crear el rol
  const { data: newRole, error: insertError } = await supabase
    .from("custom_roles_permissions")
    .insert({
      tenant_id: profile.tenant_id,
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
        JSON.stringify({ error: "Ya existe un rol con ese nombre en tu agencia" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
