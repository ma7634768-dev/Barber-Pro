import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import { fmt } from "./format";
import type { Appointment, Barbershop } from "./types";

export type AppointmentNotice = Appointment & { services: { name: string } | null; barbers: { name: string } | null };

type State = {
  items: AppointmentNotice[];
  unread: number;
  isUnread: (a: AppointmentNotice) => boolean;
  markAllSeen: () => void;
  permission: NotificationPermission | "unsupported";
  enableDeviceAlerts: () => Promise<void>;
};

const NotificationsContext = createContext<State | null>(null);
const SELECT = "*, services(name), barbers(name)";
const seenKey = (shopId: string) => `barberpro:notificacoes-vistas:${shopId}`;

function readSeen(shopId: string) {
  try {
    return localStorage.getItem(seenKey(shopId)) ?? new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

const devicePermission = (): NotificationPermission | "unsupported" =>
  typeof Notification === "undefined" || !("serviceWorker" in navigator) ? "unsupported" : Notification.permission;

function describe(a: AppointmentNotice) {
  return `${a.services?.name ?? "Serviço"} com ${a.barbers?.name ?? "barbeiro"} · ${fmt(a.start_time, "EEE, dd/MM 'às' HH:mm")}`;
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // sem som, sem problema
  }
}

async function showDeviceNotification(a: AppointmentNotice) {
  if (devicePermission() !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration();
  await reg?.showNotification(`Novo agendamento: ${a.client_name}`, {
    body: describe(a),
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: a.id,
  });
}

/** Avisa o dono a cada agendamento novo enquanto o painel estiver aberto. */
export function NotificationsProvider({ shop, children }: { shop: Barbershop; children: ReactNode }) {
  const [items, setItems] = useState<AppointmentNotice[]>([]);
  const [lastSeen, setLastSeen] = useState(() => readSeen(shop.id));
  const [permission, setPermission] = useState(devicePermission);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    supabase
      .from("appointments")
      .select(SELECT)
      .eq("barbershop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setItems((data ?? []) as AppointmentNotice[]));

    const channel = supabase
      .channel(`notificacoes-${shop.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments", filter: `barbershop_id=eq.${shop.id}` },
        async ({ new: row }) => {
          const { data } = await supabase.from("appointments").select(SELECT).eq("id", (row as Appointment).id).maybeSingle();
          if (!data) return;
          const a = data as AppointmentNotice;
          setItems((prev) => [a, ...prev.filter((x) => x.id !== a.id)].slice(0, 30));
          // Agendamentos lançados pelo próprio dono entram já confirmados: não precisa avisar
          if (a.status !== "scheduled") return;
          toast(`Novo agendamento: ${a.client_name}`, { description: describe(a), duration: 10000 });
          beep();
          showDeviceNotification(a).catch(() => {});
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop.id]);

  const isUnread = useCallback((a: AppointmentNotice) => a.created_at > lastSeen && a.status !== "confirmed", [lastSeen]);

  const markAllSeen = useCallback(() => {
    const now = new Date().toISOString();
    setLastSeen(now);
    try {
      localStorage.setItem(seenKey(shop.id), now);
    } catch {
      // modo privado: some ao recarregar
    }
  }, [shop.id]);

  const enableDeviceAlerts = useCallback(async () => {
    if (devicePermission() === "unsupported") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") toast.success("Pronto! Você vai receber um aviso a cada novo agendamento.");
  }, []);

  return (
    <NotificationsContext.Provider value={{ items, unread: items.filter(isUnread).length, isUnread, markAllSeen, permission, enableDeviceAlerts }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications precisa do NotificationsProvider");
  return ctx;
}

export { describe as describeAppointment };
