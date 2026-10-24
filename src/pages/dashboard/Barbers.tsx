import { useState, type FormEvent } from "react";
import { startOfMonth } from "date-fns";
import { Clock, DollarSign, Pencil, Plus, Scissors, Trash2, Users, UserSquare2 } from "lucide-react";
import { toast } from "sonner";
import { HoursEditor } from "@/components/HoursEditor";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner, StatCard, Toggle, cn, initials } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { useShopTable } from "@/lib/useShopTable";
import { brl, errorMessage } from "@/lib/format";
import { weekSchedule } from "@/lib/schedule";
import { isServed, priceOf, useShopAppointments } from "@/lib/stats";
import type { Barber } from "@/lib/types";

type Form = Pick<Barber, "name" | "specialty" | "email" | "phone" | "avatar_url" | "working_hours" | "is_active">;
const EMPTY: Form = { name: "", specialty: "", email: "", phone: "", avatar_url: "", working_hours: {}, is_active: true };
const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Barbers() {
  const { shop } = useBarbershop();
  const { rows, loading, reload } = useShopTable<Barber>("barbers");
  const [monthStart] = useState(() => startOfMonth(new Date()));
  const { rows: month } = useShopAppointments(monthStart, null);
  const [editing, setEditing] = useState<Barber | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [ownHours, setOwnHours] = useState(false);
  const [busy, setBusy] = useState(false);

  const open = (b: Barber | "new") => {
    setEditing(b);
    const f = b === "new" ? EMPTY : { ...b };
    setForm(f);
    setOwnHours(Object.keys(f.working_hours ?? {}).length > 0);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, specialty: form.specialty?.trim() || null, working_hours: ownHours ? form.working_hours : {}, barbershop_id: shop!.id };
    const { error } =
      editing === "new"
        ? await supabase.from("barbers").insert(payload)
        : await supabase.from("barbers").update(payload).eq("id", (editing as Barber).id);
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Barbeiro salvo.");
    setEditing(null);
    reload();
  };

  const toggleActive = async (b: Barber, is_active: boolean) => {
    const { error } = await supabase.from("barbers").update({ is_active }).eq("id", b.id);
    if (error) return toast.error(errorMessage(error));
    toast.success(is_active ? `${b.name} voltou para a agenda.` : `${b.name} saiu da página de agendamento.`);
    reload();
  };

  const remove = async (b: Barber) => {
    if (!window.confirm(`Excluir ${b.name}? Os agendamentos dele também serão apagados. Para só tirar da agenda, desative em vez de excluir.`)) return;
    const { error } = await supabase.from("barbers").delete().eq("id", b.id);
    if (error) return toast.error(errorMessage(error));
    reload();
  };

  // Atendimentos deste mês (não cancelados e que já aconteceram)
  const served = month.filter((a) => isServed(a));
  const perBarber = new Map<string, { count: number; revenue: number }>();
  for (const a of served) {
    const s = perBarber.get(a.barber_id) ?? { count: 0, revenue: 0 };
    s.count += 1;
    s.revenue += priceOf(a);
    perBarber.set(a.barber_id, s);
  }
  const monthRevenue = served.reduce((s, a) => s + priceOf(a), 0);

  return (
    <div>
      <PageHeader title="Barbeiros" subtitle="Gerencie sua equipe de profissionais." action={<Button onClick={() => open("new")}><Plus className="h-4 w-4" />Novo barbeiro</Button>} />
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={<Users className="h-6 w-6" />} value={rows.length} label="Total de Barbeiros" />
            <StatCard icon={<Scissors className="h-6 w-6" />} tone="success" value={served.length} label="Atendimentos este mês" />
            <StatCard icon={<DollarSign className="h-6 w-6" />} tone="amber" value={brl(monthRevenue)} label="Faturamento este mês" />
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={<UserSquare2 className="h-6 w-6" />} title="Nenhum barbeiro ainda" text="Cadastre sua equipe para os clientes escolherem com quem cortar." action={<Button onClick={() => open("new")}>Adicionar barbeiro</Button>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((b) => {
                const week = weekSchedule(shop!.opening_hours, b.working_hours);
                const firstOpen = week.find(Boolean);
                const stats = perBarber.get(b.id) ?? { count: 0, revenue: 0 };
                return (
                  <Card key={b.id} className={cn("p-5", !b.is_active && "opacity-70")}>
                    <div className="flex items-start gap-4">
                      {b.avatar_url ? (
                        <img src={b.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                          {initials(b.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold">{b.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{b.specialty || "Barbeiro"}</p>
                      </div>
                      <div className="flex">
                        <Button size="sm" variant="ghost" onClick={() => open(b)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(b)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <div className="flex items-center gap-2">
                          <Badge className={b.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{b.is_active ? "Ativo" : "Inativo"}</Badge>
                          <Toggle checked={b.is_active} onChange={(v) => toggleActive(b, v)} label={`Ativar ${b.name}`} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Horário</span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {firstOpen ? `${firstOpen.open} - ${firstOpen.close}` : "Sem horário"}
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground">Dias de trabalho</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {week.map((h, i) =>
                        h ? (
                          <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium" title={`${h.open} - ${h.close}`}>{DAY_SHORT[i]}</span>
                        ) : null,
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-center">
                      <div>
                        <p className="text-xl font-bold text-primary">{stats.count}</p>
                        <p className="text-xs text-muted-foreground">Atendimentos</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-success">{brl(stats.revenue)}</p>
                        <p className="text-xs text-muted-foreground">Este mês</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Novo barbeiro" : "Editar barbeiro"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nome"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Especialidade"><Input value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Ex.: Degradê & Fade" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="E-mail"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="Foto (link da imagem)"><Input type="url" value={form.avatar_url ?? ""} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Ativo (aparece na página de agendamento)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={ownHours} onChange={(e) => { setOwnHours(e.target.checked); if (e.target.checked && !Object.keys(form.working_hours).length) setForm({ ...form, working_hours: shop!.opening_hours }); }} />
            Horário próprio (senão usa o horário da barbearia)
          </label>
          {ownHours && <HoursEditor value={form.working_hours} onChange={(working_hours) => setForm({ ...form, working_hours })} />}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </form>
      </Modal>
    </div>
  );
}
