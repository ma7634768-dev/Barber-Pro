import { useState, type FormEvent } from "react";
import { Package, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner, Textarea } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { useShopTable } from "@/lib/useShopTable";
import { brl, errorMessage } from "@/lib/format";
import type { Product } from "@/lib/types";

type Form = Pick<Product, "name" | "description" | "price" | "stock" | "image_url" | "category" | "is_active">;
const EMPTY: Form = { name: "", description: "", price: 0, stock: null, image_url: "", category: "", is_active: true };

export default function Products() {
  const { shop } = useBarbershop();
  const { rows, loading, reload } = useShopTable<Product>("products");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);

  const open = (p: Product | "new") => {
    setEditing(p);
    setForm(p === "new" ? EMPTY : { ...p });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, category: form.category || null, image_url: form.image_url || null, barbershop_id: shop!.id };
    const { error } =
      editing === "new"
        ? await supabase.from("products").insert(payload)
        : await supabase.from("products").update(payload).eq("id", (editing as Product).id);
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Produto salvo.");
    setEditing(null);
    reload();
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Excluir "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(errorMessage(error));
    reload();
  };

  const changeStock = async (p: Product, delta: number) => {
    const stock = Math.max(0, (p.stock ?? 0) + delta);
    const { error } = await supabase.from("products").update({ stock }).eq("id", p.id);
    if (error) return toast.error(errorMessage(error));
    reload();
  };

  const categories = [...new Set(rows.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Pomadas, shampoos, óleos e o que mais você vende. Os ativos aparecem na sua página de agendamento."
        action={<Button onClick={() => open("new")}><Plus className="h-4 w-4" />Novo produto</Button>}
      />
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Nenhum produto ainda"
          text="Cadastre o que você vende na barbearia para seus clientes verem na hora de agendar."
          action={<Button onClick={() => open("new")}>Adicionar produto</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <Card key={p.id} className="flex flex-col overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-muted text-muted-foreground"><Package className="h-10 w-10" /></div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                  </div>
                  <span className="font-semibold text-primary">{brl(p.price)}</span>
                </div>
                {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  {p.stock === null ? (
                    <span className="text-xs text-muted-foreground">Sem controle de estoque</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 w-7 px-0" onClick={() => changeStock(p, -1)} aria-label="Tirar 1 do estoque">−</Button>
                      <span className={p.stock === 0 ? "text-sm font-medium text-destructive" : "text-sm"}>{p.stock === 0 ? "Esgotado" : `${p.stock} em estoque`}</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 px-0" onClick={() => changeStock(p, 1)} aria-label="Pôr 1 no estoque">+</Button>
                    </div>
                  )}
                  <div className="flex gap-1">
                    {!p.is_active && <Badge className="bg-muted text-muted-foreground">Inativo</Badge>}
                    <Button size="sm" variant="ghost" onClick={() => open(p)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Novo produto" : "Editar produto"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nome"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Pomada modeladora" /></Field>
          <Field label="Descrição"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preço (R$)"><Input type="number" min={0} step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
            <Field label="Estoque" hint="Deixe vazio para não controlar">
              <Input type="number" min={0} value={form.stock ?? ""} onChange={(e) => setForm({ ...form, stock: e.target.value === "" ? null : Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Categoria" hint="Ex.: Cabelo, Barba, Acessórios"><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} list="product-categories" /></Field>
          <datalist id="product-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <Field label="Foto (link da imagem)"><Input type="url" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></Field>
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
