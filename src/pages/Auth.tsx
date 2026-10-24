import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button, Card, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/format";

export default function Auth() {
  const { session } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("modo") === "cadastro" ? "signup" : "login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  if (session) return <Navigate to={(location.state as { from?: string })?.from ?? "/painel"} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name }, emailRedirectTo: `${window.location.origin}/painel` },
        });
        if (error) throw error;
        if (!data.session) toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
      }
    } catch (err) {
      const msg = errorMessage(err);
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8"><Logo /></div>
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Acesse o painel da sua barbearia." : "Leva menos de um minuto."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <Field label="Seu nome">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            </Field>
          )}
          <Field label="E-mail">
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
          <button className="font-medium text-primary hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
      </Card>
    </div>
  );
}
