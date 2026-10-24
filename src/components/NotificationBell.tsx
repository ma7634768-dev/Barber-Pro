import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, BellRing } from "lucide-react";
import { describeAppointment, useNotifications } from "@/lib/notifications";
import { Button, cn } from "./ui";

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const { items, unread, isUnread, markAllSeen, permission, enableDeviceAlerts } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = () => {
    // Marca como vistas ao fechar, para o destaque continuar visível enquanto a lista está aberta
    if (open) markAllSeen();
    setOpen(!open);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative rounded-md p-2 hover:bg-muted" aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "fixed inset-x-3 top-16 z-50 max-h-[75vh] overflow-y-auto rounded-lg border border-border bg-card shadow-2xl sm:absolute sm:inset-x-auto sm:top-11 sm:w-96",
            align === "right" ? "sm:right-0" : "sm:left-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold">Notificações</p>
            {unread > 0 && (
              <button onClick={markAllSeen} className="text-xs text-primary hover:underline">Marcar como vistas</button>
            )}
          </div>

          {permission === "default" && (
            <div className="border-b border-border bg-primary/5 px-4 py-3">
              <p className="text-sm">Receba um aviso no celular a cada novo agendamento.</p>
              <Button size="sm" className="mt-2" onClick={enableDeviceAlerts}><BellRing className="h-4 w-4" />Ativar avisos</Button>
            </div>
          )}

          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((a) => (
                <li key={a.id}>
                  <Link to="/painel/agenda" onClick={toggle} className={cn("flex gap-3 px-4 py-3 hover:bg-muted", isUnread(a) && "bg-primary/5")}>
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", isUnread(a) ? "bg-primary" : "bg-transparent")} />
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{a.client_name}</span>{" "}
                        {a.status === "cancelled" ? "cancelou" : a.status === "confirmed" ? "foi agendado" : "agendou"}
                      </p>
                      <p className="text-xs text-muted-foreground">{describeAppointment(a)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
