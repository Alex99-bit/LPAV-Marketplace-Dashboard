import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

interface SyncRequest {
  package_id: string;
  total_rooms: number;
  available_rooms: number;
  source?: string;
}

interface ExternalSaleRequest {
  package_id?: string;
  rooms_sold: number;
  total_amount?: number;
  currency?: string;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "sync";

  let body: SyncRequest | ExternalSaleRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return new Response(JSON.stringify({ error: "No perteneces a una agencia" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "external_sale") {
    const saleBody = body as ExternalSaleRequest;

    if (!saleBody.rooms_sold || saleBody.rooms_sold < 1) {
      return new Response(JSON.stringify({ error: "rooms_sold debe ser mayor a 0" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: result, error } = await supabase.rpc("register_external_sale", {
      p_tenant_id: profile.tenant_id,
      p_package_id: saleBody.package_id || null,
      p_rooms_sold: saleBody.rooms_sold,
      p_total_amount: saleBody.total_amount || null,
      p_currency: saleBody.currency || "MXN",
      p_notes: saleBody.notes || null,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sale_id: result }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "sync") {
    const syncBody = body as SyncRequest;

    if (!syncBody.package_id || syncBody.total_rooms < 0 || syncBody.available_rooms < 0) {
      return new Response(JSON.stringify({ error: "package_id, total_rooms, available_rooms requeridos y >= 0" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (syncBody.available_rooms > syncBody.total_rooms) {
      return new Response(JSON.stringify({ error: "available_rooms no puede exceder total_rooms" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pkg } = await supabase
      .from("travel_packages")
      .select("tenant_id")
      .eq("package_id", syncBody.package_id)
      .single();

    if (!pkg || (pkg as unknown as { tenant_id: string }).tenant_id !== profile.tenant_id) {
      return new Response(JSON.stringify({ error: "Paquete no encontrado o no pertenece a tu agencia" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.rpc("sync_inventory_external", {
      p_package_id: syncBody.package_id,
      p_total_rooms: syncBody.total_rooms,
      p_available_rooms: syncBody.available_rooms,
      p_source: syncBody.source || "external_pms",
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      package_id: syncBody.package_id,
      total_rooms: syncBody.total_rooms,
      available_rooms: syncBody.available_rooms,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Accion invalida. Usa ?action=sync o ?action=external_sale" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
