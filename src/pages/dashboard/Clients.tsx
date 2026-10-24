import { useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner, Textarea } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { useShopTable } from "@/lib/useShopTable";
import { errorMessage, fmt } from "@/lib/format";
import type { Client } from "@/lib/types";

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

  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter((c) => [c.name, c.phone, c.email].some((v) => v?.toLowerCase().includes(q))) : rows;

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`${rows.length} cadastrados. Quem agenda pelo link entra aqui sozinho.`} action={<Button onClick={() => open("new")}><Plus className="h-4 w-4" />Novo cliente</Button>} />
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="Nenhum cliente ainda" text="Os clientes que agendarem pelo seu link aparecem aqui automaticamente." />
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, telefone ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Card className="divide-y divide-border">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">{c.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ") || "Sem contato"}</p>
                  {c.notes && <p className="truncate text-xs text-muted-foreground/80">{c.notes}</p>}
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
