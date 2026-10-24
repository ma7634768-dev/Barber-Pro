import { useState, type FormEvent } from "react";
import { CheckCircle2, Clock, DollarSign, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pills, Spinner, StatCard, Textarea } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { useShopTable } from "@/lib/useShopTable";
import { brl, duration, errorMessage } from "@/lib/format";
import type { Service } from "@/lib/types";

type Form = Pick<Service, "name" | "description" | "duration" | "price" | "category" | "is_active">;
const EMPTY: Form = { name: "", description: "", duration: 30, price: 0, category: "", is_active: true };
const BASE_CATEGORIES = ["Cabelo", "Barba", "Combo", "Extras", "Tratamentos"];

export default function Services() {
  const { shop } = useBarbershop();
  const { rows, loading, reload } = useShopTable<Service>("services");
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("all");

  const open = (s: Service | "new") => {
    setEditing(s);
    setForm(s === "new" ? EMPTY : { ...s });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, category: form.category || null, barbershop_id: shop!.id };
    const { error } =
      editing === "new"
        ? await supabase.from("services").insert(payload)
        : await supabase.from("services").update(payload).eq("id", (editing as Service).id);
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Serviço salvo.");
    setEditing(null);
    reload();
  };

  const remove = async (s: Service) => {
    if (!window.confirm(`Excluir "${s.name}"? Os agendamentos desse serviço também serão apagados. Para só esconder, desative.`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) return toast.error(errorMessage(error));
    reload();
  };

  const visible = category === "all" ? rows : rows.filter((s) => (s.category || "Outros") === category);
  const groups = visible.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category || "Outros"] ??= []).push(s);
    return acc;
  }, {});

  const used = rows.map((s) => s.category || "Outros");
  const categories = [...new Set([...BASE_CATEGORIES, ...used])];
  const active = rows.filter((s) => s.is_active);
  const avgPrice = active.length ? active.reduce((sum, s) => sum + Number(s.price), 0) / active.length : 0;

  return (
    <div>
      <PageHeader title="Serviços" subtitle="O que você oferece, quanto tempo leva e quanto custa." action={<Button onClick={() => open("new")}><Plus className="h-4 w-4" />Novo serviço</Button>} />
      {loading ? (
        <Spinner />
      ) : (
        <>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Scissors className="h-6 w-6" />} value={rows.length} label="Total de Serviços" />
          <StatCard icon={<CheckCircle2 className="h-6 w-6" />} tone="success" value={active.length} label="Serviços Ativos" />
          <StatCard icon={<DollarSign className="h-6 w-6" />} tone="amber" value={brl(avgPrice)} label="Preço Médio" />
        </div>
        <div className="mb-6">
          <Pills
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "Todos" }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
        </div>
        {visible.length === 0 ? (
          <EmptyState
            icon={<Scissors className="h-6 w-6" />}
            title={rows.length === 0 ? "Nenhum serviço ainda" : "Nenhum serviço nesta categoria"}
            text={rows.length === 0 ? "Comece pelo básico: corte, barba e o combo." : "Cadastre um serviço e escolha essa categoria."}
            action={<Button onClick={() => open("new")}>Adicionar serviço</Button>}
          />
        ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([category, list]) => (
            <section key={category}>
              <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">{category}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((s) => (
                  <Card key={s.id} className="flex items-start gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{s.name}</p>
                        {!s.is_active && <Badge className="bg-muted text-muted-foreground">Inativo</Badge>}
                      </div>
                      {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                      <p className="mt-2 flex items-center gap-3 text-sm">
                        <span className="font-semibold text-primary">{brl(s.price)}</span>
                        <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{duration(s.duration)}</span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => open(s)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(s)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
        )}
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Novo serviço" : "Editar serviço"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nome"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Corte degradê" /></Field>
          <Field label="Descrição"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preço (R$)"><Input type="number" min={0} step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
            <Field label="Duração (min)"><Input type="number" min={5} step={5} required value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Categoria" hint="Ex.: Cabelo, Barba, Combo"><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} list="categories" /></Field>
          <datalist id="categories">{categories.filter((c) => c !== "Outros").map((c) => <option key={c} value={c} />)}</datalist>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Ativo (aparece na página de agendamento)
          </label>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </form>
      </Modal>
    </div>
  );
}
