import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { HoursEditor } from "@/components/HoursEditor";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { DEFAULT_HOURS } from "@/lib/schedule";
import { errorMessage } from "@/lib/format";

export default function Onboarding() {
  const { session } = useAuth();
  const { shop, loading, reload } = useBarbershop();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", opening_hours: DEFAULT_HOURS });

  if (loading) return <Spinner />;
  if (shop) return <Navigate to="/painel" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("barbershops").insert({ ...form, owner_id: session!.user.id });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    await reload();
    toast.success("Barbearia criada! Agora cadastre seus serviços e barbeiros.");
    navigate("/painel");
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10">
      <div className="mb-8"><Logo /></div>
      <Card className="w-full max-w-xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Vamos configurar sua barbearia</h1>
        <p className="mt-1 text-sm text-muted-foreground">Você pode mudar tudo isso depois em Configurações.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Nome da barbearia">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Barbearia do Zé" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone / WhatsApp">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="Endereço">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Horário de funcionamento</p>
            <HoursEditor value={form.opening_hours} onChange={(opening_hours) => setForm({ ...form, opening_hours })} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Criar barbearia"}</Button>
        </form>
      </Card>
    </div>
  );
}
