import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile, AuthIntent } from "@/types";
import { supabase } from "@/lib/supabaseClient";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: (intent?: AuthIntent) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    intent?: AuthIntent
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAgency: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[Auth] Error fetching profile:", error);
    }

    setProfile(data);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    const processSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const hash = window.location.hash;
        const hasAccessToken = hash && hash.includes("access_token");

        if (code) {
          console.log("[Auth] Detectado code en URL, exchangeCodeForSession...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("[Auth] Error exchangeCodeForSession:", error);
          } else if (data.session) {
            console.log("[Auth] Sesion creada desde code:", data.session.user.id);
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
            await processAuthIntent(data.session.user.id);
          }

          window.history.replaceState(null, "", window.location.pathname);
          setLoading(false);
          return;
        }

        if (hasAccessToken) {
          console.log("[Auth] Detectado access_token en hash, procesando...");
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error("[Auth] Error procesando hash:", error);
          } else if (data.session) {
            console.log("[Auth] Sesion creada desde hash:", data.session.user.id);
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
            await processAuthIntent(data.session.user.id);
          }

          window.history.replaceState(null, "", window.location.pathname);
          setLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error("[Auth] Error procesando sesion:", err);
      } finally {
        setLoading(false);
      }
    };

    processSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const processAuthIntent = async (userId: string) => {
    const intent = localStorage.getItem("auth_intent") as AuthIntent | null;
    localStorage.removeItem("auth_intent");

    if (!intent) return;

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!currentProfile) return;

    if (intent === "agency_register" && !currentProfile.tenant_id) {
      await supabase
        .from("profiles")
        .update({ role_name: "Agency_Pending" })
        .eq("id", userId);
      setProfile({ ...currentProfile, role_name: "Agency_Pending" });
    }
  };

  const signInWithGoogle = useCallback(async (intent?: AuthIntent) => {
    if (intent) {
      localStorage.setItem("auth_intent", intent);
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      intent?: AuthIntent
    ) => {
      if (intent) {
        localStorage.setItem("auth_intent", intent);
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role_name:
              intent === "agency_register" ? "Agency_Pending" : "EndUser",
          },
        },
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    localStorage.removeItem("auth_intent");
  }, []);

  const isAgency =
    profile?.role_name === "Agency_Admin" ||
    (profile?.tenant_id != null &&
      profile?.role_name !== "EndUser" &&
      profile?.role_name !== "SuperAdmin" &&
      profile?.role_name !== "Agency_Pending");

  const isSuperAdmin = profile?.role_name === "SuperAdmin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
        isAgency,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
