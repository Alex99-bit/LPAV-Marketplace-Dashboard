import { createServiceClient } from "./auth.ts";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowSeconds: 60,
};

export async function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const supabase = createServiceClient();
  const windowStart = new Date(
    Date.now() - config.windowSeconds * 1000,
  ).toISOString();

  const { data: logs } = await supabase
    .from("user_behavior_logs")
    .select("log_id")
    .eq("user_id", userId)
    .eq("event_type", action)
    .gt("created_at", windowStart);

  const count = logs?.length ?? 0;

  if (count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: config.windowSeconds,
    };
  }

  await supabase.from("user_behavior_logs").insert({
    user_id: userId,
    event_type: action,
  });

  return {
    allowed: true,
    remaining: config.maxRequests - count - 1,
  };
}
