import { supabase } from "@/lib/supabaseClient";

export type TwentyCrmTokens = {
  accessToken: string;
  refreshToken: string;
  workspaceId: string;
  userId: string;
};

export async function exchangeTokenWithTwentyCrm(
  email?: string,
): Promise<TwentyCrmTokens> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sesion no encontrada");
  }

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-exchange-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: email ?? session.user.email }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Error CRM: ${res.status}`);
  }

  return res.json();
}
