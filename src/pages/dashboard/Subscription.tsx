import { useState } from "react";
import { startOfMonth } from "date-fns";
import { CheckCircle2, Crown, FileText, Sparkles } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, cn } from "@/components/ui";
import { useShopTable } from "@/lib/useShopTable";
import { brl } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { useShopAppointments } from "@/lib/stats";
import type { Barber, Client } from "@/lib/types";

function Usage({ label, value, max }: { label: string; value: number; max: number | null }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{max ? `${value} de ${max}` : value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: max ? `${Math.min(100, (value / max) * 100)}%` : "100%" }} />
      </div>
    </div>
  );
}

export default function Subscription() {
  const { rows: barbers } = useShopTable<Barber>("barbers");
  const { rows: clients } = useShopTable<Client>("clients");
  const [monthStart] = useState(() => startOfMonth(new Date()));
  const { rows: month } = useShopAppointments(monthStart, null);
  const pro = PLANS.find((p) => p.popular)!;
  const activeBarbers = barbers.filter((b) => b.is_active).length;

  return (
    <div>
      <PageHeader title="Assinatura" subtitle="Seu plano e o uso da barbearia." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="relative overflow-hidden border-primary/50 p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Crown className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <p className="text-2xl font-bold">Lançamento <span className="text-primary">grátis</span></p>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground">
              Durante o lançamento você usa todos os recursos sem pagar nada e sem limite de barbeiros. Nenhum cartão foi cadastrado e nenhuma cobrança é feita.
            </p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {["Agenda e página de agendamento", "Barbeiros, serviços e produtos", "Clientes com histórico", "Relatórios e notificações"].map((f) => (
                <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{f}</li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="text-lg font-bold">Uso este mês</h2>
          <Usage label="Barbeiros ativos" value={activeBarbers} max={pro.maxBarbers} />
          <Usage label="Agendamentos este mês" value={month.filter((a) => a.status !== "cancelled").length} max={null} />
          <Usage label="Clientes cadastrados" value={clients.length} max={null} />
          <p className="text-xs text-muted-foreground">Limite de barbeiros mostrado como referência do plano {pro.name}.</p>
        </Card>
      </div>

      <h2 className="mb-1 mt-10 text-xl font-bold">Planos</h2>
      <p className="mb-5 text-sm text-muted-foreground">A cobrança ainda não está ativa. Quando começar, você escolhe o plano aqui.</p>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.name} className={cn("p-6", plan.popular && "border-2 border-primary")}>
            {plan.popular && (
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"><Sparkles className="h-3 w-3" />Mais Popular</span>
            )}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-sm text-muted-foreground">{plan.tagline}</p>
            <p className="mt-4">
              <span className="text-4xl font-extrabold">{brl(plan.price).replace(",00", "")}</span>
              <span className="text-muted-foreground">/mês</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{f}</li>
              ))}
            </ul>
            <Button className="mt-6 w-full" variant={plan.popular ? "primary" : "outline"} disabled>Em breve</Button>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-xl font-bold">Histórico de Faturas</h2>
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="Nenhuma fatura"
        text="Você ainda não foi cobrado. As faturas aparecem aqui quando a cobrança começar."
      />
    </div>
  );
}
