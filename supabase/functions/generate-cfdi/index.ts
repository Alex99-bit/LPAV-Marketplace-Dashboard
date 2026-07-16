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

  const body = await req.json();
  const { concept, amount, currency, tenant_id } = body;

  const supabase = createServiceClient();

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

  return new Response(JSON.stringify({
    cfdi_id: data.Id,
    uuid: data.Complement?.TaxStamp?.Uuid,
    pdf_url: data.PdfUrl,
    xml_url: data.XmlUrl,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
