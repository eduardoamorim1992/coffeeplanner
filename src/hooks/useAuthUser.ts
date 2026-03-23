import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useAuthUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // 🔥 PEGA SESSÃO ATUAL
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      console.log("🔥 sessão:", data);

      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    loadSession();

    // 🔥 ESCUTA LOGIN / LOGOUT
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔥 mudança auth:", event, session);

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };

  }, []);

  return { user, loading };
}