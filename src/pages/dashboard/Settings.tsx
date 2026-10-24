import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HoursEditor } from "@/components/HoursEditor";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/format";

export default function Settings() {
  const { shop, reload } = useBarbershop();
  const [form, setForm] = useState({
    name: shop?.name ?? "",
    phone: shop?.phone ?? "",
    address: shop?.address ?? "",
    logo_url: shop?.logo_url ?? "",
    opening_hours: shop?.opening_hours ?? {},
  });
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("barbershops").update(form).eq("id", shop!.id);
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Configurações salvas.");
    reload();
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Configurações" subtitle="Dados que aparecem na sua página de agendamento." />
      <form onSubmit={save} className="space-y-6">
        <Card className="space-y-4 p-6">
          <Field label="Nome da barbearia"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone / WhatsApp"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Logo (link da imagem)"><Input type="url" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></Field>
          </div>
          <Field label="Endereço"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-sans text-base font-semibold">Horário de funcionamento</h2>
          <HoursEditor value={form.opening_hours} onChange={(opening_hours) => setForm({ ...form, opening_hours })} />
        </Card>
        <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar alterações"}</Button>
      </form>
    </div>
  );
}
