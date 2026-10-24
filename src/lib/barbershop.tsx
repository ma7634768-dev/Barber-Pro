import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { Barbershop } from "./types";

type ShopState = { shop: Barbershop | null; loading: boolean; reload: () => Promise<void> };
const ShopContext = createContext<ShopState>({ shop: null, loading: true, reload: async () => {} });

export function BarbershopProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("barbershops")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    setShop(data as Barbershop | null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    reload();
  }, [reload]);

  return <ShopContext.Provider value={{ shop, loading, reload }}>{children}</ShopContext.Provider>;
}

export const useBarbershop = () => useContext(ShopContext);
