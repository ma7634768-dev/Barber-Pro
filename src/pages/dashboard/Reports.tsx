import { useMemo, useState } from "react";
import { addDays, startOfDay, startOfMonth, startOfYear, subDays, subMonths, subYears } from "date-fns";
import { CalendarDays, DollarSign, Download, Receipt, Scissors, UserPlus } from "lucide-react";
import { Button, Card, PageHeader, Select, Spinner, StatCard, initials } from "@/components/ui";
import { useShopTable } from "@/lib/useShopTable";
import { STATUS_LABEL, WEEKDAYS, brl, fmt } from "@/lib/format";
import { isServed, priceOf, trend, useShopAppointments, type StatAppointment } from "@/lib/stats";
import type { Barber, Client } from "@/lib/types";

type Period = "month" | "last-month" | "7d" | "30d" | "year";
const PERIODS: { value: Period; label: string }[] = [
  { value: "month", label: "Este mês" },
  { value: "last-month", label: "Mês passado" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "year", label: "Este ano" },
];

/** Período escolhido e o período anterior equivalente, para comparar. */
function ranges(period: Period, now = new Date()) {
  const tomorrow = addDays(startOfDay(now), 1);
  switch (period) {
    case "month": {
      const from = startOfMonth(now);
      return { from, to: tomorrow, prevFrom: subMonths(from, 1), prevTo: subMonths(tomorrow, 1) };
    }
    case "last-month": {
      const to = startOfMonth(now);
      const from = subMonths(to, 1);
      return { from, to, prevFrom: subMonths(from, 1), prevTo: from };
    }
    case "7d":
    case "30d": {
      const days = period === "7d" ? 7 : 30;
      const from = subDays(tomorrow, days);
      return { from, to: tomorrow, prevFrom: subDays(from, days), prevTo: from };
    }
    case "year": {
      const from = startOfYear(now);
      return { from, to: tomorrow, prevFrom: subYears(from, 1), prevTo: subYears(tomorrow, 1) };
    }
  }
}

function summarize(list: StatAppointment[]) {
  const served = list.filter((a) => isServed(a));
  const revenue = served.reduce((s, a) => s + priceOf(a), 0);
  return { served, revenue, bookings: list.filter((a) => a.status !== "cancelled").length, ticket: served.length ? revenue / served.length : 0 };
}

// Segunda primeiro, como na agenda da barbearia
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Reports() {
  const [period, setPeriod] = useState<Period>("month");
  const r = useMemo(() => ranges(period), [period]);
  const { rows, loading } = useShopAppointments(r.prevFrom, r.to);
  const { rows: barbers } = useShopTable<Barber>("barbers");
  const { rows: clients } = useShopTable<Client>("clients");

  const data = useMemo(() => {
    const from = r.from.toISOString();
    const current = rows.filter((a) => a.start_time >= from);
    const previous = rows.filter((a) => a.start_time < from && a.start_time < r.prevTo.toISOString());
    const cur = summarize(current);
    const prev = summarize(previous);
    const newClients = (a: Date, b: Date) => clients.filter((c) => c.created_at >= a.toISOString() && c.created_at < b.toISOString()).length;

    const weekdays = WEEK_ORDER.map((d) => {
      const list = cur.served.filter((a) => new Date(a.start_time).getDay() === d);
      return { day: d, count: list.length, revenue: list.reduce((s, a) => s + priceOf(a), 0) };
    });

    const byService = new Map<string, { name: string; count: number; total: number }>();
    for (const a of cur.served) {
      const s = byService.get(a.service_id) ?? { name: a.services?.name ?? "Serviço removido", count: 0, total: 0 };
      s.count += 1;
      s.total += priceOf(a);
      byService.set(a.service_id, s);
    }
    const services = [...byService.values()].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 5);

    const byBarber = barbers
      .map((b) => {
        const list = cur.served.filter((a) => a.barber_id === b.id);
        return { barber: b, count: list.length, revenue: list.reduce((s, a) => s + priceOf(a), 0) };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return { current, cur, prev, newCur: newClients(r.from, r.to), newPrev: newClients(r.prevFrom, r.prevTo), weekdays, services, byBarber };
  }, [rows, clients, barbers, r]);

  const exportCsv = () => {
    const names = new Map(barbers.map((b) => [b.id, b.name]));
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ["Data", "Hora", "Cliente", "Telefone", "Serviço", "Barbeiro", "Status", "Valor"].join(";"),
      ...data.current.map((a) =>
        [
          fmt(a.start_time, "dd/MM/yyyy"),
          fmt(a.start_time, "HH:mm"),
          esc(a.client_name),
          esc(a.client_phone ?? ""),
          esc(a.services?.name ?? ""),
          esc(names.get(a.barber_id) ?? ""),
          STATUS_LABEL[a.status],
          priceOf(a).toFixed(2).replace(".", ","),
        ].join(";"),
      ),
    ];
    // BOM para o Excel abrir os acentos certos
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${fmt(r.from, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const maxDay = Math.max(1, ...data.weekdays.map((w) => w.revenue));
  const maxBarber = Math.max(1, ...data.byBarber.map((b) => b.revenue));

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Acompanhe o desempenho da sua barbearia."
        action={
          <div className="flex gap-2">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-auto">
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <Button variant="outline" onClick={exportCsv} disabled={loading}><Download className="h-4 w-4" />Exportar</Button>
          </div>
        }
      />
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<DollarSign className="h-6 w-6" />} tone="success" value={brl(data.cur.revenue)} label="Receita Total" trend={trend(data.cur.revenue, data.prev.revenue)} />
            <StatCard icon={<CalendarDays className="h-6 w-6" />} value={data.cur.bookings} label="Agendamentos" trend={trend(data.cur.bookings, data.prev.bookings)} />
            <StatCard icon={<UserPlus className="h-6 w-6" />} tone="amber" value={data.newCur} label="Novos Clientes" trend={trend(data.newCur, data.newPrev)} />
            <StatCard icon={<Receipt className="h-6 w-6" />} tone="muted" value={brl(data.cur.ticket)} label="Ticket Médio" trend={trend(data.cur.ticket, data.prev.ticket)} />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Receita = preço dos serviços dos atendimentos que já aconteceram (cancelados não contam). Produtos vendidos no balcão não entram.
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-lg font-bold">Desempenho Semanal</h2>
              <p className="text-sm text-muted-foreground">Receita por dia da semana</p>
              <div className="mt-5 space-y-3">
                {data.weekdays.map((w) => (
                  <div key={w.day} className="flex items-center gap-3 text-sm">
                    <span className="w-10 shrink-0 text-muted-foreground">{WEEKDAYS[w.day].slice(0, 3)}</span>
                    <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-muted">
                      {w.revenue > 0 && (
                        <div className="flex h-full items-center whitespace-nowrap rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground" style={{ width: `${Math.max(30, (w.revenue / maxDay) * 100)}%` }}>
                          {brl(w.revenue)}
                        </div>
                      )}
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">{w.count} atend.</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold">Serviços Mais Vendidos</h2>
              <p className="text-sm text-muted-foreground">Ranking do período</p>
              {data.services.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Nenhum atendimento no período.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {data.services.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.count} {s.count === 1 ? "vez" : "vezes"} · média {brl(s.total / s.count)}</p>
                      </div>
                      <span className="font-semibold text-success">{brl(s.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-bold">Desempenho por Barbeiro</h2>
            <p className="text-sm text-muted-foreground">Faturamento e atendimentos no período</p>
            {data.byBarber.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Cadastre barbeiros para ver o desempenho.</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.byBarber.map(({ barber, count, revenue }) => (
                  <div key={barber.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{initials(barber.name)}</div>
                      <p className="min-w-0 flex-1 truncate font-semibold">{barber.name}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Faturamento</p>
                        <p className="font-bold text-success">{brl(revenue)}</p>
                      </div>
                      <div>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Scissors className="h-3 w-3" />Atendimentos</p>
                        <p className="font-bold">{count}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(revenue / maxBarber) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
