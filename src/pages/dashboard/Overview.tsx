import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Copy, DollarSign, Scissors, UserSquare2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, PageHeader } from "@/components/ui";
import { useBarbershop } from "@/lib/barbershop";
import { supabase } from "@/lib/supabase";
import { dayBounds } from "@/lib/schedule";
import { brl, fmt, STATUS_LABEL } from "@/lib/format";
import type { Appointment } from "@/lib/types";

type Row = Appointment & { services: { name: string; price: number } | null; barbers: { name: string } | null };

export default function Overview() {
  const { shop } = useBarbershop();
  const [today, setToday] = useState<Row[]>([]);
  const [counts, setCounts] = useState({ barbers: 0, services: 0, clients: 0 });

  useEffect(() => {
    if (!shop) return;
    const { from, to } = dayBounds(new Date());
    supabase
      .from("appointments")
      .select("*, services(name, price), barbers(name)")
      .eq("barbershop_id", shop.id)
      .gte("start_time", from.toISOString())
      .lt("start_time", to.toISOString())
      .order("start_time")
      .then(({ data }) => setToday((data ?? []) as Row[]));
    Promise.all(
      (["barbers", "services", "clients"] as const).map((t) =>
        supabase.from(t).select("id", { count: "exact", head: true }).eq("barbershop_id", shop.id),
      ),
    ).then(([b, s, c]) => setCounts({ barbers: b.count ?? 0, services: s.count ?? 0, clients: c.count ?? 0 }));
  }, [shop]);

  if (!shop) return null;
  const active = today.filter((a) => a.status !== "cancelled");
  const revenue = active.reduce((sum, a) => sum + Number(a.services?.price ?? 0), 0);
  const next = active.find((a) => new Date(a.end_time) > new Date() && a.status !== "completed");
  const link = `${window.location.origin}/agendar/${shop.id}`;
  const setupDone = counts.barbers > 0 && counts.services > 0;

  const stats = [
    { label: "Agendamentos hoje", value: active.length, icon: CalendarDays },
    { label: "Previsto hoje", value: brl(revenue), icon: DollarSign },
    { label: "Barbeiros", value: counts.barbers, icon: UserSquare2 },
    { label: "Clientes", value: counts.clients, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Olá, ${shop.name}`} subtitle={fmt(new Date(), "EEEE, d 'de' MMMM")} />

      {!setupDone && (
        <Card className="border-primary/40 bg-primary/5 p-5">
          <h2 className="font-sans text-base font-semibold">Falta pouco para receber agendamentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre pelo menos um barbeiro e um serviço.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {counts.barbers === 0 && <Link to="/painel/barbeiros"><Button size="sm"><UserSquare2 className="h-4 w-4" />Adicionar barbeiro</Button></Link>}
            {counts.services === 0 && <Link to="/painel/servicos"><Button size="sm"><Scissors className="h-4 w-4" />Adicionar serviço</Button></Link>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">{label}</span>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-base font-semibold">Agenda de hoje</h2>
            <Link to="/painel/agenda" className="text-sm text-primary hover:underline">Ver agenda</Link>
          </div>
          {today.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
          ) : (
            <ul className="divide-y divide-border">
              {today.map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <span className="w-12 font-semibold text-primary">{fmt(a.start_time, "HH:mm")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.client_name}</p>
                    <p className="truncate text-sm text-muted-foreground">{a.services?.name} · {a.barbers?.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{STATUS_LABEL[a.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-sans text-base font-semibold">Próximo cliente</h2>
            {next ? (
              <div className="mt-3">
                <p className="text-2xl font-semibold text-primary">{fmt(next.start_time, "HH:mm")}</p>
                <p className="mt-1 font-medium">{next.client_name}</p>
                <p className="text-sm text-muted-foreground">{next.services?.name} com {next.barbers?.name}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Ninguém na fila por enquanto.</p>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="font-sans text-base font-semibold">Seu link de agendamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">Coloque na bio do Instagram e no WhatsApp.</p>
            <div className="mt-3 flex gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">{link}</code>
              <Button
                size="sm"
                variant="outline"
                aria-label="Copiar link"
                onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copiado!"))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
