import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, CalendarDays, CheckCircle2, Clock, Scissors, ShoppingBag, Sparkles, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, Card, cn } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { PaymentMethods } from "@/components/PaymentMethods";

const FEATURES = [
  { icon: CalendarDays, title: "Agenda Inteligente", text: "Gerencie todos os agendamentos em uma agenda visual e intuitiva, separada por barbeiro." },
  { icon: Scissors, title: "Gestão de Barbeiros", text: "Controle horários individuais, serviços e disponibilidade de cada profissional." },
  { icon: Users, title: "CRM de Clientes", text: "Histórico, próximo horário marcado, preferências e notas de cada cliente." },
  { icon: Clock, title: "Evite Conflitos", text: "Sistema que impede agendamentos sobrepostos automaticamente." },
  { icon: ShoppingBag, title: "Produtos e Estoque", text: "Mostre pomadas, óleos e shampoos na sua página e controle o estoque." },
  { icon: Bell, title: "Notificações na Hora", text: "Receba um aviso no celular a cada novo agendamento feito pelo link." },
];

const PREVIEW = [
  { time: "09:00", name: "João Silva", detail: "Corte + Barba · Carlos", status: "Confirmado" },
  { time: "10:00", name: "Pedro Santos", detail: "Corte Degradê · Rafael", status: "Confirmado" },
  { time: "11:30", name: "Lucas Oliveira", detail: "Barba · Carlos", status: "Agendado" },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-semibold">{children}</span>;
}

export default function Landing() {
  const { session } = useAuth();
  const startLink = session ? "/painel" : "/entrar?modo=cadastro";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="container flex items-center justify-between gap-3 py-3">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#precos" className="hover:text-foreground">Preços</a>
          </nav>
          <div className="flex items-center gap-2">
            {!session && (
              <Link to="/entrar" className="px-2 text-sm font-medium hover:text-primary">Entrar</Link>
            )}
            <Link to={startLink}>
              <Button size="sm" className="h-9">
                {session ? "Ir para o painel" : "Começar Grátis"}
                <ArrowRight className="hidden h-4 w-4 sm:block" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="container relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Agendamento online para barbearias
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] sm:text-6xl">
              A agenda da sua barbearia, <span className="text-primary">sempre cheia</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0">
              Seus clientes marcam pelo celular, você acompanha tudo num painel simples: barbeiros, serviços, produtos e clientes.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link to={startLink}>
                <Button size="lg" className="w-full sm:w-auto">Começar Grátis<ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <a href="#recursos">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">Ver recursos</Button>
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-bold">Agenda de Hoje</h3>
              <div className="mt-4 space-y-3">
                {PREVIEW.map((p) => (
                  <div key={p.time} className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
                    <span className="font-semibold text-primary">{p.time}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{p.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{p.detail}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        p.status === "Confirmado" ? "bg-success/10 text-success" : "bg-primary/10 text-primary",
                      )}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5 text-center">
                <p className="text-2xl font-bold text-primary sm:text-3xl">12</p>
                <p className="text-sm text-muted-foreground">Agendamentos hoje</p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-2xl font-bold text-success sm:text-3xl">R$ 1.240</p>
                <p className="text-sm text-muted-foreground">Previsto hoje</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="container scroll-mt-20 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Recursos</SectionLabel>
          <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl">Tudo que você precisa para gerenciar sua barbearia</h2>
          <p className="mt-4 text-lg text-muted-foreground">Uma plataforma completa desenvolvida especialmente para o dia a dia de barbearias e salões.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-7 transition hover:border-primary/50 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="precos" className="container scroll-mt-20 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Preços</SectionLabel>
          <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl">Planos que cabem no seu bolso</h2>
          <p className="mt-4 text-lg text-muted-foreground">Escolha o plano ideal para o tamanho da sua barbearia. Comece grátis.</p>
        </div>
        <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <Card key={plan.name} className={cn("p-7", plan.popular && "border-2 border-primary shadow-xl shadow-primary/10 lg:-mt-4")}>
              {plan.popular && (
                <span className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">Mais Popular</span>
              )}
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-muted-foreground">{plan.tagline}</p>
              <p className="mt-6">
                <span className="text-5xl font-extrabold">R$ {plan.price}</span>
                <span className="text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={startLink} className="mt-8 block">
                <Button size="lg" variant={plan.popular ? "primary" : "outline"} className="w-full">Começar agora</Button>
              </Link>
            </Card>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Formas de pagamento</p>
          <PaymentMethods className="justify-center" />
        </div>
      </section>

      <section className="container pb-24">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Pronto para organizar sua barbearia?</h2>
          <p className="max-w-lg text-primary-foreground/85">Crie sua conta, cadastre seus serviços e compartilhe o link de agendamento com seus clientes hoje mesmo.</p>
          <Link to={startLink}>
            <Button size="lg" variant="outline" className="border-transparent text-primary">Criar minha conta<ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Barber Pro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
