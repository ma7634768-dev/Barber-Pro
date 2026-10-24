import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import { useBarbershop } from "./barbershop";

/** Carrega todas as linhas de uma tabela da barbearia atual. */
export function useShopTable<T>(table: "barbers" | "services" | "clients", orderBy = "name") {
  const { shop } = useBarbershop();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!shop) return;
    const { data, error } = await supabase.from(table).select("*").eq("barbershop_id", shop.id).order(orderBy);
    if (error) toast.error(error.message);
    setRows((data ?? []) as T[]);
    setLoading(false);
  }, [shop, table, orderBy]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, reload };
}
