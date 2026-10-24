import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { addDays, isSameDay, startOfDay } from "date-fns";
import { ArrowLeft, CalendarCheck, Clock, MapPin, Package, Phone, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, Input, Spinner, Textarea, cn } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { dayBounds, freeSlots, hoursFor } from "@/lib/schedule";
import { brl, duration, errorMessage, fmt } from "@/lib/format";
import type { BookingPage } from "@/lib/types";

type Step = "service" | "barber" | "time" | "details" | "done";
const STEPS: { key: Step; label: string }[] = [
  { key: "service", label: "Serviço" },
  { key: "barber", label: "Barbeiro" },
  { key: "time", label: "Horário" },
  { key: "details", label: "Seus dados" },
];

export default function Booking() {
  const { shopId } = useParams();
  const [page, setPage] = useState<BookingPage | null | undefined>(undefined);
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [slots, setSlots] = useState<Date[] | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.rpc("get_booking_page", { p_barbershop_id: shopId }).then(({ data, error }) => {
      setPage(error ? null : (data as BookingPage | null));
    });
  }, [shopId]);

  const service = page?.services.find((s) => s.id === serviceId);
  const barber = page?.barbers.find((b) => b.id === barberId);

  useEffect(() => {
    if (step !== "time" || !page || !service || !barber) return;
    setSlots(null);
    const hours = hoursFor(day, page.barbershop.opening_hours, barber.working_hours);
    if (!hours) return setSlots([]);
    const { from, to } = dayBounds(day);
    supabase
      .rpc("get_busy_slots", { p_barber_id: barber.id, p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data }) => setSlots(freeSlots(day, hours, service.duration, data ?? [])));
  }, [step, day, page, service, barber]);

  if (page === undefined) return <Spinner />;
  if (page === null)
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted-foreground">
        Barbearia não encontrada. Confira o link com a barbearia.
      </div>
    );

  const { barbershop: shop } = page;
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i));
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const book = async (e: FormEvent) => {
    e.preventDefault();
    if (!time) return;
    setBusy(true);
    const { error } = await supabase.rpc("book_appointment", {
      p_barbershop_id: shop.id,
      p_barber_id: barberId,
      p_service_id: serviceId,
      p_start_time: time.toISOString(),
      p_client_name: form.name,
      p_client_phone: form.phone,
      p_client_email: form.email || null,
      p_notes: form.notes || null,
    });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      setStep("time");
      return;
    }
    setStep("done");
  };

  const back = () => setStep(STEPS[Math.max(0, stepIndex - 1)].key);

  return (
    <div className="min-h-screen pb-16">
      <header className="relative overflow-hidden border-b border-border bg-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.2),transparent_70%)]" />
        <div className="container relative flex flex-col items-center py-10 text-center">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt="" className="mb-4 h-20 w-20 rounded-full border-2 border-primary object-cover" />
          ) : (
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-card text-primary">
              <Scissors className="h-8 w-8" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold sm:text-4xl">{shop.name}</h1>
          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {shop.address && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{shop.address}</span>}
            {shop.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{shop.phone}</span>}
          </div>
        </div>
      </header>

      <main className="container max-w-2xl pt-8">
        {step === "done" ? (
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <CalendarCheck className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-semibold">Horário reservado!</h2>
            <p className="mt-2 text-muted-foreground">
              {service?.name} com {barber?.name}
              <br />
              <span className="font-medium text-foreground">{time && fmt(time, "EEEE, d 'de' MMMM 'às' HH:mm")}</span>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">Se precisar remarcar, fale com a barbearia{shop.phone ? ` pelo ${shop.phone}` : ""}.</p>
            <Button className="mt-6" variant="outline" onClick={() => { setStep("service"); setTime(null); }}>Fazer outro agendamento</Button>
          </Card>
        ) : (
          <>
            <ol className="mb-6 flex gap-2">
              {STEPS.map((s, i) => (
                <li key={s.key} className="flex-1">
                  <div className={cn("h-1 rounded-full", i <= stepIndex ? "bg-primary" : "bg-muted")} />
                  <p className={cn("mt-2 text-xs", i === stepIndex ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
                </li>
              ))}
            </ol>
            {stepIndex > 0 && (
              <button onClick={back} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />Voltar
              </button>
            )}

            {step === "service" && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">Escolha o serviço</h2>
                  <p className="mt-1 text-muted-foreground">Selecione o serviço que deseja agendar</p>
                </div>
                {page.services.length === 0 && <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p>}
                {page.services.map((s) => (
                  <button key={s.id} onClick={() => { setServiceId(s.id); setStep("barber"); }} className="w-full text-left">
                    <Card className="flex items-center gap-4 p-4 transition hover:border-primary">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{s.name}</p>
                        {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{duration(s.duration)}</p>
                      </div>
                      <span className="font-semibold text-primary">{brl(s.price)}</span>
                    </Card>
                  </button>
                ))}
                {!!page.products?.length && (
                  <section className="pt-8">
                    <h2 className="text-2xl font-bold">Produtos da casa</h2>
                    <p className="mt-1 text-sm text-muted-foreground">À venda na barbearia. Peça no dia do seu horário.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {page.products.map((p) => (
                        <Card key={p.id} className={cn("overflow-hidden", !p.in_stock && "opacity-50")}>
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="aspect-square w-full object-cover" />
                          ) : (
                            <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground"><Package className="h-8 w-8" /></div>
                          )}
                          <div className="p-3">
                            <p className="text-sm font-semibold leading-tight">{p.name}</p>
                            <p className="mt-1 text-sm font-semibold text-primary">{p.in_stock ? brl(p.price) : "Esgotado"}</p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {step === "barber" && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">Com quem?</h2>
                  <p className="mt-1 text-muted-foreground">Escolha o profissional que vai te atender</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {page.barbers.map((b) => (
                    <button key={b.id} onClick={() => {
                      setBarberId(b.id);
                      setTime(null);
                      // primeiro dia em que o barbeiro ainda atende (hoje só se ainda não fechou)
                      setDay(
                        days.find((d) => {
                          const h = hoursFor(d, shop.opening_hours, b.working_hours);
                          return h && (!isSameDay(d, new Date()) || h.close! > fmt(new Date(), "HH:mm"));
                        }) ?? days[0],
                      );
                      setStep("time");
                    }} className="text-left">
                      <Card className="flex items-center gap-4 p-4 transition hover:border-primary">
                        {b.avatar_url ? (
                          <img src={b.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 font-display text-lg font-bold text-primary">{b.name.charAt(0)}</div>
                        )}
                        <span className="font-semibold">{b.name}</span>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "time" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Escolha o horário</h2>
                  <p className="mt-1 text-muted-foreground">Veja os horários livres e toque no que preferir</p>
                </div>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
                  {days.map((d) => {
                    const open = barber && hoursFor(d, shop.opening_hours, barber.working_hours);
                    return (
                      <button
                        key={d.toISOString()}
                        disabled={!open}
                        onClick={() => { setDay(d); setTime(null); }}
                        className={cn(
                          "flex w-16 shrink-0 flex-col items-center rounded-lg border py-2 transition disabled:opacity-30",
                          isSameDay(d, day) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary",
                        )}
                      >
                        <span className="text-xs uppercase">{fmt(d, "EEE").slice(0, 3)}</span>
                        <span className="text-lg font-semibold">{fmt(d, "dd")}</span>
                      </button>
                    );
                  })}
                </div>
                {slots === null ? (
                  <Spinner />
                ) : slots.length === 0 ? (
                  <p className="rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">Sem horários livres nesse dia. Tente outra data.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {slots.map((t) => (
                      <button
                        key={t.toISOString()}
                        onClick={() => { setTime(t); setStep("details"); }}
                        className="rounded-md border border-border bg-card py-2.5 text-sm font-medium transition hover:border-primary hover:text-primary"
                      >
                        {fmt(t, "HH:mm")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === "details" && time && (
              <form onSubmit={book} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Confirme seus dados</h2>
                  <p className="mt-1 text-muted-foreground">Só falta isso para garantir seu horário</p>
                </div>
                <Card className="p-4 text-sm">
                  <p className="font-semibold">{service?.name} · {service && brl(service.price)}</p>
                  <p className="text-muted-foreground">com {barber?.name} · {fmt(time, "EEEE, d/MM 'às' HH:mm")}</p>
                </Card>
                <Field label="Nome"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></Field>
                <Field label="WhatsApp"><Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" autoComplete="tel" /></Field>
                <Field label="E-mail (opcional)"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></Field>
                <Field label="Observação (opcional)"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
                <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Reservando..." : "Confirmar agendamento"}</Button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
