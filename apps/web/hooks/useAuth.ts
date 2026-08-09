"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";

export function useAuth(): { user: User | null; isAuthenticated: boolean; loading: boolean; logout: () => Promise<void> } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const clearWorkspace = useAuthStore((s) => s.clear);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function logout(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkspace();
    window.location.href = "/login";
  }

  return { user, isAuthenticated: !!user, loading, logout };
}
