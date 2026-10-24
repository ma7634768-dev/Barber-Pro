import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { addDays, addMinutes, format, isToday } from "date-fns";
import { Check, CheckCheck, ChevronLeft, ChevronRight, Phone, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, cn } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { useShopTable } from "@/lib/useShopTable";
import { dayBounds, freeSlots, hoursFor } from "@/lib/schedule";
import { brl, errorMessage, fmt, STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import type { Appointment, AppointmentStatus, Barber, Service } from "@/lib/types";

export default function Agenda() {
  const { shop } = useBarbershop();
  const { rows: barbers } = useShopTable<Barber>("barbers");
  const { rows: services } = useShopTable<Service>("services");
  const [day, setDay] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!shop) return;
    const { from, to } = dayBounds(day);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("barbershop_id", shop.id)
      .gte("start_time", from.toISOString())
      .lt("start_time", to.toISOString())
      .order("start_time");
    if (error) toast.error(error.message);
    setAppointments((data ?? []) as Appointment[]);
    setLoading(false);
  }, [shop, day]);

  useEffect(() => {
    load();
  }, [load]);

  // Atualiza sozinho quando chega agendamento pela página pública
  useEffect(() => {
    if (!shop) return;
    const channel = supabase
      .channel(`appointments-${shop.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `barbershop_id=eq.${shop.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop, load]);

  const setStatus = async (a: Appointment, status: AppointmentStatus) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", a.id);
    if (error) return toast.error(errorMessage(error));
    load();
  };

  const serviceById = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);
  const columns = barbers.filter((b) => b.is_active || appointments.some((a) => a.barber_id === b.id));

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={fmt(day, "EEEE, d 'de' MMMM 'de' yyyy")}
        action={<Button onClick={() => setCreating(true)} disabled={!barbers.length || !services.length}><Plus className="h-4 w-4" />Novo agendamento</Button>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setDay(addDays(day, -1))} aria-label="Dia anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant={isToday(day) ? "primary" : "outline"} size="sm" onClick={() => setDay(new Date())}>Hoje</Button>
        <Button variant="outline" size="sm" onClick={() => setDay(addDays(day, 1))} aria-label="Próximo dia"><ChevronRight className="h-4 w-4" /></Button>
        <Input type="date" className="h-8 max-w-[170px]" value={format(day, "yyyy-MM-dd")} onChange={(e) => e.target.value && setDay(new Date(`${e.target.value}T12:00`))} />
      </div>

      {loading ? (
        <Spinner />
      ) : columns.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Cadastre barbeiros e serviços para começar a usar a agenda.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((b) => {
            const list = appointments.filter((a) => a.barber_id === b.id);
            return (
              <Card key={b.id} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-sans text-base font-semibold">{b.name}</h2>
                  <span className="text-xs text-muted-foreground">{list.filter((a) => a.status !== "cancelled").length} atendimento(s)</span>
                </div>
                {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Agenda livre.</p>}
                <div className="space-y-2">
                  {list.map((a) => {
                    const s = serviceById[a.service_id];
                    return (
                      <div key={a.id} className={cn("rounded-md border border-border bg-background p-3", a.status === "cancelled" && "opacity-50")}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-primary">{fmt(a.start_time, "HH:mm")} – {fmt(a.end_time, "HH:mm")}</p>
                            <p className="font-medium">{a.client_name}</p>
                            <p className="text-sm text-muted-foreground">{s?.name ?? "Serviço"}{s ? ` · ${brl(s.price)}` : ""}</p>
                          </div>
                          <Badge className={STATUS_STYLE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                        </div>
                        {a.notes && <p className="mt-2 text-xs text-muted-foreground">“{a.notes}”</p>}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {a.client_phone && (
                            <a href={`https://wa.me/55${a.client_phone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="ghost"><Phone className="h-3.5 w-3.5" />WhatsApp</Button>
                            </a>
                          )}
                          {a.status === "scheduled" && <Button size="sm" variant="ghost" onClick={() => setStatus(a, "confirmed")}><Check className="h-3.5 w-3.5" />Confirmar</Button>}
                          {(a.status === "scheduled" || a.status === "confirmed") && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setStatus(a, "completed")}><CheckCheck className="h-3.5 w-3.5" />Concluir</Button>
                              <Button size="sm" variant="ghost" onClick={() => setStatus(a, "cancelled")}><X className="h-3.5 w-3.5" />Cancelar</Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {creating && (
        <NewAppointment
          day={day}
          barbers={barbers.filter((b) => b.is_active)}
          services={services.filter((s) => s.is_active)}
          appointments={appointments}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function NewAppointment({ day, barbers, services, appointments, onClose, onSaved }: {
  day: Date; barbers: Barber[]; services: Service[]; appointments: Appointment[]; onClose: () => void; onSaved: () => void;
}) {
  const { shop } = useBarbershop();
  const [form, setForm] = useState({ barber_id: barbers[0]?.id ?? "", service_id: services[0]?.id ?? "", time: "", client_name: "", client_phone: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const service = services.find((s) => s.id === form.service_id);
  const barber = barbers.find((b) => b.id === form.barber_id);
  const hours = barber && hoursFor(day, shop!.opening_hours, barber.working_hours);
  const busySlots = appointments.filter((a) => a.barber_id === form.barber_id && a.status !== "cancelled");
  // O dono pode lançar encaixes no passado do dia (cliente que chegou sem marcar)
  const slots = hours && service ? freeSlots(day, hours, service.duration, busySlots, 15, new Date(0)) : [];

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!service || !form.time) return;
    setBusy(true);
    try {
      const start = new Date(form.time);
      const phone = form.client_phone.trim();
      let client_id: string | null = null;
      if (phone) {
        const { data: existing } = await supabase.from("clients").select("id").eq("barbershop_id", shop!.id).eq("phone", phone).maybeSingle();
        client_id = existing?.id ?? null;
        if (!client_id) {
          const { data, error } = await supabase.from("clients").insert({ barbershop_id: shop!.id, name: form.client_name, phone }).select("id").single();
          if (error) throw error;
          client_id = data.id;
        }
      }
      const { error } = await supabase.from("appointments").insert({
        barbershop_id: shop!.id,
        barber_id: form.barber_id,
        service_id: form.service_id,
        client_id,
        client_name: form.client_name,
        client_phone: phone || null,
        start_time: start.toISOString(),
        end_time: addMinutes(start, service.duration).toISOString(),
        status: "confirmed",
        notes: form.notes || null,
      });
      if (error) throw error;
      toast.success("Agendamento criado.");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Novo agendamento · ${fmt(day, "dd/MM")}`}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Barbeiro">
            <Select value={form.barber_id} onChange={(e) => setForm({ ...form, barber_id: e.target.value, time: "" })}>
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Serviço">
            <Select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value, time: "" })}>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {brl(s.price)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Horário">
          {slots.length === 0 ? (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{hours ? "Sem horários livres nesse dia." : "Fechado nesse dia."}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((t) => (
                <button
                  type="button"
                  key={t.toISOString()}
                  onClick={() => setForm({ ...form, time: t.toISOString() })}
                  className={cn("rounded-md border py-2 text-sm", form.time === t.toISOString() ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}
                >
                  {fmt(t, "HH:mm")}
                </button>
              ))}
            </div>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do cliente"><Input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} /></Field>
        </div>
        <Field label="Observações"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <Button type="submit" className="w-full" disabled={busy || !form.time}>{busy ? "Salvando..." : "Agendar"}</Button>
      </form>
    </Modal>
  );
}
