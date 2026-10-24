-- Barber Pro: assinatura do sistema (cobrança pela Kiwify)
-- Só o servidor (função kiwify-webhook, com a chave service_role) escreve aqui.
-- O dono da barbearia só lê, então não consegue se "auto-ativar".

create table if not exists public.subscriptions (
  barbershop_id uuid primary key references public.barbershops(id) on delete cascade,
  plan text not null check (plan in ('basico', 'pro', 'business')),
  status text not null check (status in ('active', 'late', 'canceled', 'refunded')),
  kiwify_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid references public.barbershops(id) on delete set null,
  kiwify_order_id text not null,
  event text not null,
  plan text,
  amount numeric(10,2),
  payment_method text,
  status text not null,
  customer_email text,
  created_at timestamptz not null default now(),
  unique (kiwify_order_id, event)
);
create index if not exists invoices_barbershop_idx on public.invoices(barbershop_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "Owners read their subscription" on public.subscriptions;
create policy "Owners read their subscription" on public.subscriptions
  for select using (public.owns_barbershop(barbershop_id));
drop policy if exists "Owners read their invoices" on public.invoices;
create policy "Owners read their invoices" on public.invoices
  for select using (public.owns_barbershop(barbershop_id));

revoke all on public.subscriptions, public.invoices from anon, authenticated;
grant select on public.subscriptions, public.invoices to authenticated;
