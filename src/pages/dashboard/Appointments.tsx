import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Check, CheckCheck, ClipboardList, Phone, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Pills, Spinner, cn } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { STATUS_LABEL, STATUS_STYLE, brl, errorMessage, fmt } from "@/lib/format";
import type { Appointment, AppointmentStatus } from "@/lib/types";

type Row = Appointment & { services: { name: string; price: number } | null; barbers: { name: string } | null };
type Tab = "upcoming" | "past" | "cancelled";
const LIMIT = 300;

export default function Appointments() {
  const { shop } = useBarbershop();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    const now = new Date().toISOString();
    let q = supabase.from("appointments").select("*, services(name, price), barbers(name)").eq("barbershop_id", shop.id).limit(LIMIT);
    if (tab === "upcoming") q = q.neq("status", "cancelled").gte("start_time", now).order("start_time");
    if (tab === "past") q = q.neq("status", "cancelled").lt("start_time", now).order("start_time", { ascending: false });
    if (tab === "cancelled") q = q.eq("status", "cancelled").order("start_time", { ascending: false });
    const { data, error } = await q;
    if (error) toast.error(errorMessage(error));
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [shop, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (a: Row, status: AppointmentStatus) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", a.id);
    if (error) return toast.error(errorMessage(error));
    toast.success(`Agendamento ${STATUS_LABEL[status].toLowerCase()}.`);
    load();
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter((a) => [a.client_name, a.client_phone, a.services?.name, a.barbers?.name].some((v) => v?.toLowerCase().includes(q)))
    : rows;

  return (
    <div>
      <PageHeader title="Agendamentos" subtitle="Todos os horários marcados, do mais próximo ao mais distante." />
      <Card className="mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <Pills
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: "Próximos" },
            { value: "past", label: "Passados" },
            { value: "cancelled", label: "Cancelados" },
          ]}
        />
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente, serviço ou barbeiro" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title={q ? "Nada encontrado" : tab === "upcoming" ? "Nenhum horário marcado" : "Nenhum agendamento aqui"}
          text={tab === "upcoming" && !q ? "Compartilhe seu link de agendamento para os clientes marcarem." : "Tente outra busca ou aba."}
        />
      ) : (
        <Card className="divide-y divide-border">
          {filtered.map((a) => (
            <div key={a.id} className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center", a.status === "cancelled" && "opacity-60")}>
              <div className="flex w-20 shrink-0 flex-row items-baseline gap-2 sm:flex-col sm:gap-0">
                <span className="text-lg font-bold text-primary">{fmt(a.start_time, "HH:mm")}</span>
                <span className="text-xs capitalize text-muted-foreground">{fmt(a.start_time, "EEE, dd/MM")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{a.client_name}</p>
                  <Badge className={STATUS_STYLE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {a.services?.name ?? "Serviço removido"} · {a.barbers?.name ?? "Barbeiro removido"}
                  {a.services && <> · <span className="font-medium text-foreground">{brl(a.services.price)}</span></>}
                </p>
                {a.notes && <p className="mt-0.5 text-xs text-muted-foreground/80">“{a.notes}”</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                {a.client_phone && (
                  <a href={`https://wa.me/55${a.client_phone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost"><Phone className="h-3.5 w-3.5" />WhatsApp</Button>
                  </a>
                )}
                {a.status === "scheduled" && <Button size="sm" variant="ghost" onClick={() => setStatus(a, "confirmed")}><Check className="h-3.5 w-3.5" />Confirmar</Button>}
                {(a.status === "scheduled" || a.status === "confirmed") && (
                  <>
                    {tab === "past" && <Button size="sm" variant="ghost" onClick={() => setStatus(a, "completed")}><CheckCheck className="h-3.5 w-3.5" />Concluir</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setStatus(a, "cancelled")}><X className="h-3.5 w-3.5" />Cancelar</Button>
                  </>
                )}
                {a.status === "cancelled" && new Date(a.start_time) > new Date() && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(a, "confirmed")}><CalendarCheck className="h-3.5 w-3.5" />Reativar</Button>
                )}
              </div>
            </div>
          ))}
          {rows.length === LIMIT && <p className="px-5 py-3 text-center text-xs text-muted-foreground">Mostrando os {LIMIT} mais recentes.</p>}
        </Card>
      )}
    </div>
  );
}
