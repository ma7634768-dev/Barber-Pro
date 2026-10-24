import { useEffect, useMemo, useState, type FormEvent } from "react";
import { subDays } from "date-fns";
import { CalendarClock, History, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner, Textarea } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { useShopTable } from "@/lib/useShopTable";
import { errorMessage, fmt } from "@/lib/format";
import type { Appointment, Client } from "@/lib/types";

type Visit = Pick<Appointment, "client_id" | "client_phone" | "start_time" | "status">;
type Summary = { next?: string; last?: string; visits: number };

type Form = Pick<Client, "name" | "email" | "phone" | "notes">;
const EMPTY: Form = { name: "", email: "", phone: "", notes: "" };

export default function Clients() {
  const { shop } = useBarbershop();
  const { rows, loading, reload } = useShopTable<Client>("clients");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);

  const open = (c: Client | "new") => {
    setEditing(c);
    setForm(c === "new" ? EMPTY : { ...c });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, barbershop_id: shop!.id };
    const { error } =
      editing === "new"
        ? await supabase.from("clients").insert(payload)
        : await supabase.from("clients").update(payload).eq("id", (editing as Client).id);
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Cliente salvo.");
    setEditing(null);
    reload();
  };

  const remove = async (c: Client) => {
    if (!window.confirm(`Excluir ${c.name}? O histórico de agendamentos fica, mas sem vínculo com o cadastro.`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) return toast.error(errorMessage(error));
    reload();
  };

  const [visits, setVisits] = useState<Visit[]>([]);
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);

  useEffect(() => {
    if (!shop) return;
    supabase
      .from("appointments")
      .select("client_id, client_phone, start_time, status")
      .eq("barbershop_id", shop.id)
      .neq("status", "cancelled")
      .gte("start_time", subDays(new Date(), 365).toISOString())
      .order("start_time")
      .then(({ data }) => setVisits((data ?? []) as Visit[]));
  }, [shop]);

  // Próximo horário e última visita de cada cliente (pelo cadastro ou, se faltar, pelo telefone)
  const summaries = useMemo(() => {
    const now = new Date().toISOString();
    const byKey = new Map<string, Summary>();
    for (const v of visits) {
      for (const key of [v.client_id, v.client_phone && `tel:${v.client_phone}`]) {
        if (!key) continue;
        const s = byKey.get(key) ?? { visits: 0 };
        if (v.start_time > now) s.next ??= v.start_time;
        else {
          s.last = v.start_time;
          s.visits += 1;
        }
        byKey.set(key, s);
      }
    }
    return new Map(rows.map((c) => [c.id, byKey.get(c.id) ?? (c.phone ? byKey.get(`tel:${c.phone}`) : undefined) ?? { visits: 0 }]));
  }, [visits, rows]);

  const q = query.trim().toLowerCase();
  let filtered = q ? rows.filter((c) => [c.name, c.phone, c.email].some((v) => v?.toLowerCase().includes(q))) : rows;
  if (onlyUpcoming) {
    filtered = filtered
      .filter((c) => summaries.get(c.id)?.next)
      .sort((a, b) => summaries.get(a.id)!.next!.localeCompare(summaries.get(b.id)!.next!));
  }
  const upcomingCount = rows.filter((c) => summaries.get(c.id)?.next).length;

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`${rows.length} cadastrados. Quem agenda pelo link entra aqui sozinho.`} action={<Button onClick={() => open("new")}><Plus className="h-4 w-4" />Novo cliente</Button>} />
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="Nenhum cliente ainda" text="Os clientes que agendarem pelo seu link aparecem aqui automaticamente." />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, telefone ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={onlyUpcoming ? "outline" : "primary"} onClick={() => setOnlyUpcoming(false)}>Todos</Button>
              <Button size="sm" variant={onlyUpcoming ? "primary" : "outline"} onClick={() => setOnlyUpcoming(true)}>Com horário marcado ({upcomingCount})</Button>
            </div>
          </div>
          <Card className="divide-y divide-border">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">{c.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ") || "Sem contato"}</p>
                  {c.notes && <p className="truncate text-xs text-muted-foreground/80">{c.notes}</p>}
                  <ClientDates summary={summaries.get(c.id)} />
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">desde {fmt(c.created_at, "MMM yyyy")}</span>
                <Button size="sm" variant="ghost" onClick={() => open(c)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {filtered.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
          </Card>
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Novo cliente" : "Editar cliente"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nome"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="E-mail"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="Observações" hint="Ex.: prefere máquina 2 nas laterais"><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </form>
      </Modal>
    </div>
  );
}

function ClientDates({ summary }: { summary?: Summary }) {
  if (!summary || (!summary.next && !summary.last)) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {summary.next && (
        <span className="flex items-center gap-1 font-medium text-primary">
          <CalendarClock className="h-3.5 w-3.5" />
          Agendado: {fmt(summary.next, "EEE, dd/MM 'às' HH:mm")}
        </span>
      )}
      {summary.last && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          Última visita: {fmt(summary.last, "dd/MM/yy")} · {summary.visits} {summary.visits === 1 ? "visita" : "visitas"}
        </span>
      )}
    </div>
  );
}
