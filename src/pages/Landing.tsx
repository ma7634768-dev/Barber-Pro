import { Link } from "react-router-dom";
import { BarChart3, CalendarCheck, Clock, Smartphone, Star, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  { icon: CalendarCheck, title: "Agenda online 24h", text: "Seus clientes marcam pelo link da barbearia, sem precisar te chamar no WhatsApp." },
  { icon: Users, title: "Equipe organizada", text: "Cada barbeiro com seus horários e sua agenda, sem conflito de horário." },
  { icon: Clock, title: "Serviços e preços", text: "Corte, barba, combo: defina duração e valor e a agenda calcula o resto." },
  { icon: BarChart3, title: "Visão do dia", text: "Quantos atendimentos, quanto entrou e quem é o próximo cliente." },
  { icon: Smartphone, title: "Feito para o celular", text: "Funciona no celular do barbeiro e no do cliente, sem instalar nada." },
  { icon: Star, title: "Clientes fiéis", text: "Histórico de cada cliente com observações para atender do jeito certo." },
];

export default function Landing() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="container flex items-center justify-between py-5">
        <Logo />
        <Link to={session ? "/painel" : "/entrar"}>
          <Button variant="outline" size="sm">{session ? "Ir para o painel" : "Entrar"}</Button>
        </Link>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />
        <div className="container relative py-20 text-center sm:py-28">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-primary">Gestão para barbearias</p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Sua barbearia com a <span className="text-gradient-gold">agenda sempre cheia</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Agendamento online, controle de barbeiros, serviços e clientes. Tudo em um painel simples, do jeito que a sua barbearia precisa.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={session ? "/painel" : "/entrar?modo=cadastro"}>
              <Button size="lg" className="w-full sm:w-auto">Começar grátis</Button>
            </Link>
            <a href="#recursos">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Ver recursos</Button>
            </a>
          </div>
        </div>
      </section>

      <section id="recursos" className="container py-20">
        <h2 className="mb-12 text-center text-3xl font-semibold sm:text-4xl">Tudo que você precisa no dia a dia</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-6 transition hover:border-primary/50">
              <Icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container pb-24">
        <Card className="flex flex-col items-center gap-6 bg-gradient-to-br from-card to-muted p-10 text-center">
          <h2 className="text-3xl font-semibold">Pronto para organizar sua barbearia?</h2>
          <p className="max-w-lg text-muted-foreground">Crie sua conta, cadastre seus serviços e compartilhe o link de agendamento com seus clientes hoje mesmo.</p>
          <Link to="/entrar?modo=cadastro"><Button size="lg">Criar minha conta</Button></Link>
        </Card>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Barber Pro
      </footer>
    </div>
  );
}
