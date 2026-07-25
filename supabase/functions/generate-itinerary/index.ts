import { getCorsHeaders } from "../_shared/cors.ts";
import { getUser, createServiceClient } from "../_shared/auth.ts";

const ITINERARY_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    totalDays: { type: "number" },
    description: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dayNumber: { type: "number" },
          title: { type: "string" },
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "string" },
                description: { type: "string" },
                location: { type: "string" },
              },
              required: ["time", "description"],
            },
          },
        },
        required: ["dayNumber", "title", "activities"],
      },
    },
  },
  required: ["title", "totalDays", "days"],
};

const RATE_LIMIT_TIERS: Record<number, number> = {
  1: 15 * 60 * 1000,
  2: 60 * 60 * 1000,
  3: 24 * 60 * 60 * 1000,
};

const MAX_PER_MINUTE = 3;
const MAX_PER_DAY = 5;
const WINDOW_60S = 60_000;
const WINDOW_24H = 24 * 60 * 60 * 1000;

async function getInfractionCount(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: bans } = await supabase
    .from("user_behavior_logs")
    .select("metadata")
    .eq("user_id", userId)
    .eq("event_type", "rate_limit_ban")
    .gt("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false });

  return bans?.length ?? 0;
}

async function checkRateLimit(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<{ allowed: boolean; error?: string; infractions: number }> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { data: bans } = await supabase
    .from("user_behavior_logs")
    .select("metadata")
    .eq("user_id", userId)
    .eq("event_type", "rate_limit_ban")
    .gt("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (bans && bans.length > 0) {
    const metadata = bans[0].metadata as { ban_until: string };
    if (new Date(metadata.ban_until) > now) {
      return {
        allowed: false,
        error: `Funciones de IA suspendidas. Reintenta despues de ${new Date(metadata.ban_until).toLocaleTimeString()}`,
        infractions: bans.length,
      };
    }
  }

  const oneMinuteAgo = new Date(now.getTime() - WINDOW_60S).toISOString();
  const { data: recentEvents } = await supabase
    .from("user_behavior_logs")
    .select("log_id")
    .eq("user_id", userId)
    .eq("event_type", "generate_itinerary")
    .gt("created_at", oneMinuteAgo);

  const recentCount = recentEvents?.length ?? 0;
  if (recentCount >= MAX_PER_MINUTE) {
    const infractions = await getInfractionCount(supabase, userId);
    const newInfractions = infractions + 1;
    const tier = Math.min(newInfractions, 3);
    const banDuration = RATE_LIMIT_TIERS[tier];
    const banUntil = new Date(now.getTime() + banDuration);

    await supabase.from("user_behavior_logs").insert({
      user_id: userId,
      event_type: "rate_limit_ban",
      metadata: { ban_type: "rate_limit", ban_level: tier, ban_until: banUntil.toISOString() },
    });

    const messages: Record<number, string> = {
      1: "Limite excedido. IA bloqueada por 15 minutos.",
      2: "Limite excedido. IA bloqueada por 1 hora.",
      3: "Limite excedido. IA suspendida hasta el siguiente dia.",
    };

    return { allowed: false, error: messages[tier] || messages[3], infractions: newInfractions };
  }

  const oneDayAgo = new Date(now.getTime() - WINDOW_24H).toISOString();
  const { data: dailyEvents } = await supabase
    .from("user_behavior_logs")
    .select("log_id")
    .eq("user_id", userId)
    .eq("event_type", "generate_itinerary")
    .gt("created_at", oneDayAgo);

  const dailyCount = dailyEvents?.length ?? 0;
  if (dailyCount >= MAX_PER_DAY) {
    return { allowed: false, error: "Limite diario de 5 itinerarios alcanzado.", infractions: 0 };
  }

  return { allowed: true, infractions: 0 };
}

async function generateWithGemini(prompt: string): Promise<Record<string, unknown>> {
  const API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!API_KEY) throw new Error("GEMINI_API_KEY no configurada");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: ITINERARY_SCHEMA,
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no genero contenido valido");
  return JSON.parse(text);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Registro obligatorio para usar IA" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();

  let packageId: string;
  let clusterHash: string | undefined;
  try {
    const body = await req.json();
    packageId = body.package_id;
    clusterHash = body.cluster_interests_hash;
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!packageId) {
    return new Response(
      JSON.stringify({ error: "package_id es requerido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const rateCheck = await checkRateLimit(supabase, user.id);
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: rateCheck.error }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data: pkg } = await supabase
      .from("travel_packages")
      .select("title, region, price, currency, departure_date, has_coordinator")
      .eq("package_id", packageId)
      .single();

    if (!pkg) {
      return new Response(JSON.stringify({ error: "Paquete no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (clusterHash) {
      const { data: cached } = await supabase
        .from("cached_itineraries")
        .select("itinerary_json")
        .eq("package_id", packageId)
        .eq("cluster_interests_hash", clusterHash)
        .maybeSingle();

      if (cached?.itinerary_json) {
        return new Response(JSON.stringify(cached.itinerary_json), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: userProfile } = await supabase
      .from("user_recommendation_profiles")
      .select("preferred_destinations, target_budget_range")
      .eq("user_id", user.id)
      .maybeSingle();

    const interestsContext = userProfile
      ? `Intereses: destino ${userProfile.preferred_destinations?.join(", ") ?? "no especificado"}, presupuesto ${userProfile.target_budget_range ?? "no especificado"}.`
      : "";

    const prompt = `Genera un itinerario detallado dia por dia en JSON para:
DESTINO: ${pkg.title} (${pkg.region})
PRECIO: ${pkg.price} ${pkg.currency}
FECHA: ${pkg.departure_date}
COORDINADOR: ${pkg.has_coordinator ? "Si" : "No"}
${interestsContext}
Crea un itinerario atractivo con actividades contextualizadas.`;

    let itinerary: Record<string, unknown>;
    try {
      itinerary = await generateWithGemini(prompt);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Error generando itinerario" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const effectiveHash = clusterHash || "default";
    await supabase.from("cached_itineraries").upsert(
      { package_id: packageId, cluster_interests_hash: effectiveHash, itinerary_json: itinerary },
      { onConflict: "package_id, cluster_interests_hash" },
    );

    await supabase.from("user_behavior_logs").insert({
      user_id: user.id,
      event_type: "generate_itinerary",
      package_id: packageId,
      metadata: { cluster_hash: effectiveHash },
    });

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
