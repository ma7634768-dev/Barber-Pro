import { useEffect, useState } from "react";
import { startOfMonth } from "date-fns";
import { AlertTriangle, CheckCircle2, Crown, FileText, Sparkles } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, cn } from "@/components/ui";
import { PaymentMethods } from "@/components/PaymentMethods";
import { useAuth } from "@/lib/auth";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { useShopTable } from "@/lib/useShopTable";
import { brl, fmt } from "@/lib/format";
import { PLANS, checkoutLink, planById } from "@/lib/plans";
import { useShopAppointments } from "@/lib/stats";
import type { Barber, Client, Invoice, Subscription as Sub } from "@/lib/types";

const METHOD_LABEL: Record<string, string> = { pix: "Pix", boleto: "Boleto", billet: "Boleto", credit_card: "Cartão" };

function Usage({ label, value, max }: { label: string; value: number; max: number | null }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{max ? `${value} de ${max}` : value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", max && value > max ? "bg-destructive" : "bg-primary")} style={{ width: max ? `${Math.min(100, (value / max) * 100)}%` : "100%" }} />
      </div>
    </div>
  );
}

export default function Subscription() {
  const { shop } = useBarbershop();
  const { session } = useAuth();
  const { rows: barbers } = useShopTable<Barber>("barbers");
  const { rows: clients } = useShopTable<Client>("clients");
  const [monthStart] = useState(() => startOfMonth(new Date()));
  const { rows: month } = useShopAppointments(monthStart, null);
  const [sub, setSub] = useState<Sub | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!shop) return;
    supabase.from("subscriptions").select("*").eq("barbershop_id", shop.id).maybeSingle().then(({ data }) => setSub(data as Sub | null));
    supabase.from("invoices").select("*").eq("barbershop_id", shop.id).order("created_at", { ascending: false }).limit(24).then(({ data }) => setInvoices((data ?? []) as Invoice[]));
  }, [shop]);

  const current = planById(sub?.plan);
  // Cancelada continua valendo até o fim do período já pago
  const paidUntil = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const isActive = !!sub && (sub.status === "active" || (sub.status === "canceled" && !!paidUntil && paidUntil > new Date()));
  const reference = current ?? PLANS.find((p) => p.popular)!;
  const activeBarbers = barbers.filter((b) => b.is_active).length;
  const email = session?.user.email;

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
                {current && isActive ? (
                  <p className="text-2xl font-bold">Plano <span className="text-primary">{current.name}</span> · {brl(current.price)}/mês</p>
                ) : (
                  <p className="text-2xl font-bold">Lançamento <span className="text-primary">grátis</span></p>
                )}
              </div>
              {sub && (
                <Badge className={cn("ml-auto", isActive && sub.status === "active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                  {sub.status === "active" ? "Ativo" : sub.status === "late" ? "Pagamento atrasado" : sub.status === "refunded" ? "Reembolsado" : "Cancelado"}
                </Badge>
              )}
            </div>

            {current && isActive ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {sub!.status === "canceled"
                  ? `Assinatura cancelada. Você continua com o plano até ${fmt(paidUntil!, "dd/MM/yyyy")}.`
                  : paidUntil
                    ? `Próxima cobrança em ${fmt(paidUntil, "dd/MM/yyyy")}. Para trocar o cartão ou cancelar, use o e-mail da Kiwify que você recebeu na compra.`
                    : "Assinatura ativa."}
              </p>
            ) : sub?.status === "late" ? (
              <p className="mt-4 flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                O último pagamento não foi confirmado. Pague a cobrança que a Kiwify enviou por e-mail para manter o plano.
              </p>
            ) : (
              <p className="mt-4 max-w-xl text-sm text-muted-foreground">
                Durante o lançamento você usa todos os recursos sem pagar nada. Escolha um plano abaixo quando quiser assinar.
              </p>
            )}
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {(current && isActive ? current.features : ["Agenda e página de agendamento", "Barbeiros, serviços e produtos", "Clientes com histórico", "Relatórios e notificações"]).map((f) => (
                <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{f}</li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="text-lg font-bold">Uso este mês</h2>
          <Usage label="Barbeiros ativos" value={activeBarbers} max={reference.maxBarbers} />
          <Usage label="Agendamentos este mês" value={month.filter((a) => a.status !== "cancelled").length} max={null} />
          <Usage label="Clientes cadastrados" value={clients.length} max={null} />
          {!(current && isActive) && <p className="text-xs text-muted-foreground">Limite de barbeiros mostrado como referência do plano {reference.name}.</p>}
        </Card>
      </div>

      <h2 className="mb-1 mt-10 text-xl font-bold">Planos</h2>
      <p className="mb-5 text-sm text-muted-foreground">Pagamento seguro pela Kiwify. Use o mesmo e-mail da sua conta do Barber Pro.</p>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const link = shop ? checkoutLink(plan, shop.id, email) : null;
          const isCurrent = isActive && current?.id === plan.id;
          return (
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
              {isCurrent ? (
                <Button className="mt-6 w-full" variant="outline" disabled>Seu plano atual</Button>
              ) : link ? (
                <a href={link} target="_blank" rel="noreferrer" className="mt-6 block">
                  <Button className="w-full" variant={plan.popular ? "primary" : "outline"}>{isActive ? "Trocar para este" : "Assinar"}</Button>
                </a>
              ) : (
                <Button className="mt-6 w-full" variant={plan.popular ? "primary" : "outline"} disabled>Em breve</Button>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold">Formas de pagamento</h2>
          <p className="text-sm text-muted-foreground">No cartão a cobrança é automática todo mês. No Pix e no boleto chega uma cobrança nova a cada mês.</p>
        </div>
        <PaymentMethods />
      </Card>

      <h2 className="mb-4 mt-10 text-xl font-bold">Histórico de Faturas</h2>
      {invoices.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} title="Nenhuma fatura" text="Você ainda não foi cobrado. Os pagamentos aparecem aqui assim que a Kiwify confirmar." />
      ) : (
        <Card className="divide-y divide-border">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-4 px-5 py-4 text-sm">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Plano {planById(inv.plan)?.name ?? inv.plan}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(inv.created_at, "dd/MM/yyyy")}
                  {inv.payment_method && ` · ${METHOD_LABEL[inv.payment_method] ?? inv.payment_method}`}
                </p>
              </div>
              <span className="font-semibold">{inv.amount !== null ? brl(inv.amount) : "—"}</span>
              <Badge className={inv.status === "paid" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>{inv.status === "paid" ? "Pago" : "Reembolsado"}</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
