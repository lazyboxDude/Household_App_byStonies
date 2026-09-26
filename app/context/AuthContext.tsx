"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

// Tasks (with its Cleaning Plan sub-tab) is the always-on baseline feature —
// everything else starts off for a new household and is switched on
// individually from Settings, so new households aren't overwhelmed.
export type OptionalFeature = "shopping" | "expenses" | "calendar";

interface Household {
  id: string;
  name: string;
  inviteCode: string;
  members: User[];
  enabledFeatures: OptionalFeature[];
}

interface AuthContextType {
  user: User | null;
  household: Household | null;
  login: (name: string, captchaToken?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<boolean>;
  toggleFeature: (feature: OptionalFeature, enabled: boolean) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function avatarFallback(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

function toUser(authUser: SupabaseUser, profile?: { name: string; avatar_url: string | null } | null): User {
  const meta = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    name: profile?.name || meta.full_name || meta.name || "Member",
    email: authUser.email ?? undefined,
    avatar: profile?.avatar_url || meta.avatar_url || avatarFallback(authUser.id),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Reload the caller's household (at most one, for now) and its member list.
  const loadHousehold = useCallback(async (userId: string) => {
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id, households(id, name, invite_code, enabled_features)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const h = membership?.households as
      | { id: string; name: string; invite_code: string; enabled_features: string[] }
      | null
      | undefined;
    if (!h) {
      setHousehold(null);
      return;
    }

    const { data: memberRows } = await supabase
      .from("household_members")
      .select("user_id, profiles(id, name, avatar_url)")
      .eq("household_id", h.id);

    const members: User[] = (memberRows ?? []).map((row) => {
      const p = row.profiles as { id: string; name: string; avatar_url: string | null } | null;
      return {
        id: row.user_id,
        name: p?.name || "Member",
        avatar: p?.avatar_url || avatarFallback(row.user_id),
      };
    });

    setHousehold({
      id: h.id,
      name: h.name,
      inviteCode: h.invite_code,
      members,
      enabledFeatures: h.enabled_features as OptionalFeature[],
    });
  }, []);

  const loadProfile = useCallback(
    async (authUser: SupabaseUser) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();
      setUser(toUser(authUser, profile));
      await loadHousehold(authUser.id);
    },
    [loadHousehold]
  );

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          loadProfile(session.user).finally(() => setIsLoading(false));
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        // A network hiccup here must not leave the app stuck on a blank
        // screen forever — fall back to "signed out" and let the user retry.
        console.error("Failed to load auth session:", err);
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setUser(null);
        setHousehold(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [loadProfile]);

  const login = async (name: string, captchaToken?: string) => {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { name }, captchaToken },
    });
    if (error || !data.user) {
      console.error("Anonymous sign-in failed:", error);
      alert(
        "Sign-in failed. If you're the project owner: enable Anonymous Sign-Ins (and check the Turnstile secret key, if Captcha protection is on) under Authentication in the Supabase dashboard. Otherwise try Google."
      );
      return false;
    }
    await loadProfile(data.user);
    return true;
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) {
      console.error("Google sign-in failed:", error);
      alert("Failed to start Google sign-in. Check the Google provider configuration in Supabase.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHousehold(null);
    router.push("/login");
  };

  const createHousehold = async (name: string) => {
    const { data, error } = await supabase.rpc("create_household", { p_name: name });
    if (error || !data) {
      console.error("Create household failed:", error);
      alert("Could not create the household. Please try again.");
      return;
    }
    if (user) await loadHousehold(user.id);
  };

  const joinHousehold = async (code: string) => {
    const { data, error } = await supabase.rpc("join_household", { p_invite_code: code });
    if (error || !data) {
      console.error("Join household failed:", error);
      return false;
    }
    if (user) await loadHousehold(user.id);
    return true;
  };

  const toggleFeature = async (feature: OptionalFeature, enabled: boolean) => {
    if (!household) return;
    const nextFeatures = enabled
      ? [...new Set([...household.enabledFeatures, feature])]
      : household.enabledFeatures.filter((f) => f !== feature);

    setHousehold({ ...household, enabledFeatures: nextFeatures });
    const { error } = await supabase
      .from("households")
      .update({ enabled_features: nextFeatures })
      .eq("id", household.id);
    if (error) {
      console.error("Failed to update household features:", error);
      setHousehold(household);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        household,
        login,
        loginWithGoogle,
        logout,
        createHousehold,
        joinHousehold,
        toggleFeature,
        isAuthenticated: !!user,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
