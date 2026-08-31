import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const facturamaKey = Deno.env.get("FACTURAMA_API_KEY");
  const facturamaUrl = Deno.env.get("FACTURAMA_API_URL") || "https://api.facturama.mx/2/";
  if (!facturamaKey) {
    return new Response(JSON.stringify({ error: "Facturama no configurado" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { concept, amount, currency, tenant_id } = body as {
    concept?: string;
    amount?: number;
    currency?: string;
    tenant_id?: string;
  };

  if (!concept || !amount || !tenant_id || amount <= 0) {
    return new Response(JSON.stringify({ error: "Faltan campos requeridos: concept, amount > 0, tenant_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  // Verify the caller owns this tenant (prevent BOLA/IDOR)
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role_name")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.tenant_id !== tenant_id && profile.role_name !== "SuperAdmin")) {
    return new Response(JSON.stringify({ error: "No autorizado para este tenant" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tenant } = await supabase
    .from("agencies_tenants")
    .select("rfc, business_name, address_text")
    .eq("tenant_id", tenant_id)
    .single();

  if (!tenant) {
    return new Response(JSON.stringify({ error: "Tenant no encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cfdiPayload = {
    Name: tenant.business_name,
    CfdiType: "I",
    PaymentForm: "99",
    Currency: currency || "MXN",
    Receiver: {
      Rfc: tenant.rfc,
      Name: tenant.business_name,
      CfdiUse: "G03",
      FiscalRegime: "601",
      TaxZipCode: "06700",
    },
    Items: [{
      ProductCode: "84111506",
      Description: concept,
      UnitCode: "E48",
      UnitPrice: amount,
      Quantity: 1,
      Subtotal: amount,
      Total: amount * 1.16,
      Taxes: [{
        Name: "IVA",
        Rate: 0.16,
        Type: "Traslado",
        Total: amount * 0.16,
      }],
    }],
  };

  const res = await fetch(`${facturamaUrl}cfi/33`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(facturamaKey)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cfdiPayload),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.Message || "Error timbrando CFDI" }), {
      status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cfdiUuid = data.Complement?.TaxStamp?.Uuid || null;
  const pdfUrl = data.PdfUrl || null;
  const xmlUrl = data.XmlUrl || null;

  // Persistir resultado en fiscal_income_records si se proporciono income_id
  const incomeId = body.income_id;
  if (incomeId && cfdiUuid) {
    await supabase
      .from("fiscal_income_records")
      .update({
        cfdi_uuid: cfdiUuid,
        cfdi_status: "issued",
        cfdi_pdf_url: pdfUrl,
        cfdi_xml_url: xmlUrl,
      })
      .eq("income_id", incomeId);
  }

  return new Response(JSON.stringify({
    cfdi_id: data.Id,
    uuid: cfdiUuid,
    pdf_url: pdfUrl,
    xml_url: xmlUrl,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
