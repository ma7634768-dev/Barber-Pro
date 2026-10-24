import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, UserSquare2 } from "lucide-react";
import { toast } from "sonner";
import { HoursEditor } from "@/components/HoursEditor";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { useShopTable } from "@/lib/useShopTable";
import { errorMessage } from "@/lib/format";
import type { Barber } from "@/lib/types";

type Form = Pick<Barber, "name" | "email" | "phone" | "avatar_url" | "working_hours" | "is_active">;
const EMPTY: Form = { name: "", email: "", phone: "", avatar_url: "", working_hours: {}, is_active: true };

export default function Barbers() {
  const { shop } = useBarbershop();
  const { rows, loading, reload } = useShopTable<Barber>("barbers");
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
    const payload = { ...form, working_hours: ownHours ? form.working_hours : {}, barbershop_id: shop!.id };
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

  const remove = async (b: Barber) => {
    if (!window.confirm(`Excluir ${b.name}? Os agendamentos dele também serão apagados. Para só tirar da agenda, desative em vez de excluir.`)) return;
    const { error } = await supabase.from("barbers").delete().eq("id", b.id);
    if (error) return toast.error(errorMessage(error));
    reload();
  };

  return (
    <div>
      <PageHeader title="Barbeiros" subtitle="Quem atende na sua barbearia." action={<Button onClick={() => open("new")}><Plus className="h-4 w-4" />Novo barbeiro</Button>} />
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState icon={<UserSquare2 className="h-6 w-6" />} title="Nenhum barbeiro ainda" text="Cadastre sua equipe para os clientes escolherem com quem cortar." action={<Button onClick={() => open("new")}>Adicionar barbeiro</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((b) => (
            <Card key={b.id} className="flex items-center gap-4 p-5">
              {b.avatar_url ? (
                <img src={b.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 font-display text-xl font-bold text-primary">
                  {b.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{b.name}</p>
                <p className="truncate text-sm text-muted-foreground">{b.phone || b.email || "Sem contato"}</p>
                {!b.is_active && <Badge className="mt-1 bg-muted text-muted-foreground">Inativo</Badge>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => open(b)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(b)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Novo barbeiro" : "Editar barbeiro"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nome"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
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
