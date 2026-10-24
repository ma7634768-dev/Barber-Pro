import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useBarbershop } from "./barbershop";
import type { AppointmentStatus } from "./types";

export type StatAppointment = {
  id: string;
  barber_id: string;
  service_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  start_time: string;
  status: AppointmentStatus;
  services: { name: string; price: number } | null;
};

/** Conta como atendimento: não cancelado e com horário que já passou. */
export const isServed = (a: StatAppointment, now = new Date().toISOString()) => a.status !== "cancelled" && a.start_time <= now;

export const priceOf = (a: StatAppointment) => Number(a.services?.price ?? 0);

export const revenueOf = (list: StatAppointment[]) => list.filter((a) => isServed(a)).reduce((s, a) => s + priceOf(a), 0);

export function trend(current: number, previous: number) {
  if (!previous) return current ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Agendamentos da barbearia entre `from` e `to` (sem limite: o PostgREST pagina em 1000). */
export function useShopAppointments(from: Date | null, to: Date | null) {
  const { shop } = useBarbershop();
  const [rows, setRows] = useState<StatAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const key = `${from?.toISOString()}|${to?.toISOString()}`;

  useEffect(() => {
    if (!shop) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all: StatAppointment[] = [];
      for (let page = 0; ; page++) {
        let q = supabase
          .from("appointments")
          .select("id, barber_id, service_id, client_id, client_name, client_phone, start_time, status, services(name, price)")
          .eq("barbershop_id", shop.id)
          .order("start_time")
          .range(page * 1000, page * 1000 + 999);
        if (from) q = q.gte("start_time", from.toISOString());
        if (to) q = q.lt("start_time", to.toISOString());
        const { data, error } = await q;
        if (error || !data) break;
        all.push(...(data as unknown as StatAppointment[]));
        if (data.length < 1000) break;
      }
      if (!cancelled) {
        setRows(all);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, key]);

  return { rows, loading };
}
