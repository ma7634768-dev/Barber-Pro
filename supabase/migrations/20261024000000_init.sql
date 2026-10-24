-- Barber Pro: schema inicial
-- Mesmas tabelas do projeto original, com estas correções de segurança:
--   * a página pública não lê mais a tabela de agendamentos (dados de clientes ficam privados);
--     ela usa get_busy_slots(), que devolve só os horários ocupados;
--   * agendamento público passa por book_appointment(), que valida barbeiro, serviço,
--     horário e status;
--   * a página pública lê barbearia, barbeiros e serviços por get_booking_page(),
--     sem expor e-mail/telefone dos barbeiros nem o dono;
--   * o banco impede dois agendamentos do mesmo barbeiro no mesmo horário.

create extension if not exists btree_gist;

-- Perfis --------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Barbearias ----------------------------------------------------------------
-- opening_hours: { "0": {"closed": true}, "1": {"open": "09:00", "close": "19:00"}, ... }
-- (chave = dia da semana, 0 = domingo)
create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  logo_url text,
  address text,
  phone text,
  opening_hours jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index barbershops_owner_id_idx on public.barbershops(owner_id);

-- Barbeiros -----------------------------------------------------------------
-- working_hours no mesmo formato de opening_hours; vazio = segue o horário da barbearia
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  avatar_url text,
  working_hours jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index barbers_barbershop_id_idx on public.barbers(barbershop_id);

-- Serviços ------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  description text,
  duration integer not null default 30 check (duration > 0),
  price numeric(10,2) not null default 0 check (price >= 0),
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_barbershop_id_idx on public.services(barbershop_id);

-- Clientes ------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_barbershop_id_idx on public.clients(barbershop_id);
create index clients_phone_idx on public.clients(barbershop_id, phone);

-- Agendamentos --------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_phone text,
  client_email text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  -- mesmo barbeiro não pode ter dois horários sobrepostos (cancelados não contam)
  constraint appointments_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status <> 'cancelled')
);
create index appointments_shop_start_idx on public.appointments(barbershop_id, start_time);
create index appointments_client_id_idx on public.appointments(client_id);

-- RLS -----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.barbershops enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = user_id);
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "Owners manage their barbershop" on public.barbershops
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.owns_barbershop(p_barbershop_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from barbershops where id = p_barbershop_id and owner_id = auth.uid());
$$;

create policy "Owners manage their barbers" on public.barbers
  for all using (public.owns_barbershop(barbershop_id)) with check (public.owns_barbershop(barbershop_id));
create policy "Owners manage their services" on public.services
  for all using (public.owns_barbershop(barbershop_id)) with check (public.owns_barbershop(barbershop_id));
create policy "Owners manage their clients" on public.clients
  for all using (public.owns_barbershop(barbershop_id)) with check (public.owns_barbershop(barbershop_id));
create policy "Owners manage their appointments" on public.appointments
  for all using (public.owns_barbershop(barbershop_id)) with check (public.owns_barbershop(barbershop_id));

-- Página pública (somente via funções) ---------------------------------------
create or replace function public.get_booking_page(p_barbershop_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'barbershop', jsonb_build_object(
      'id', b.id, 'name', b.name, 'logo_url', b.logo_url,
      'address', b.address, 'phone', b.phone, 'opening_hours', b.opening_hours),
    'barbers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'name', x.name, 'avatar_url', x.avatar_url, 'working_hours', x.working_hours)
        order by x.name)
      from barbers x where x.barbershop_id = b.id and x.is_active), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'duration', s.duration, 'price', s.price, 'category', s.category)
        order by s.category nulls last, s.name)
      from services s where s.barbershop_id = b.id and s.is_active), '[]'::jsonb)
  )
  from barbershops b where b.id = p_barbershop_id;
$$;

create or replace function public.get_busy_slots(p_barber_id uuid, p_from timestamptz, p_to timestamptz)
returns table (start_time timestamptz, end_time timestamptz)
language sql stable security definer set search_path = public as $$
  select a.start_time, a.end_time from appointments a
  where a.barber_id = p_barber_id
    and a.status <> 'cancelled'
    and a.start_time < p_to and a.end_time > p_from
  order by a.start_time;
$$;

create or replace function public.book_appointment(
  p_barbershop_id uuid,
  p_barber_id uuid,
  p_service_id uuid,
  p_start_time timestamptz,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_duration integer;
  v_client_id uuid;
  v_id uuid;
begin
  if coalesce(trim(p_client_name), '') = '' or coalesce(trim(p_client_phone), '') = '' then
    raise exception 'Nome e telefone são obrigatórios';
  end if;
  if p_start_time < now() then
    raise exception 'Escolha um horário no futuro';
  end if;
  if not exists (select 1 from barbers where id = p_barber_id and barbershop_id = p_barbershop_id and is_active) then
    raise exception 'Barbeiro indisponível';
  end if;
  select duration into v_duration from services
    where id = p_service_id and barbershop_id = p_barbershop_id and is_active;
  if v_duration is null then
    raise exception 'Serviço indisponível';
  end if;

  select id into v_client_id from clients
    where barbershop_id = p_barbershop_id and phone = trim(p_client_phone) limit 1;
  if v_client_id is null then
    insert into clients (barbershop_id, name, phone, email)
      values (p_barbershop_id, trim(p_client_name), trim(p_client_phone), nullif(trim(p_client_email), ''))
      returning id into v_client_id;
  end if;

  begin
    insert into appointments (barbershop_id, barber_id, service_id, client_id,
      client_name, client_phone, client_email, start_time, end_time, status, notes)
    values (p_barbershop_id, p_barber_id, p_service_id, v_client_id,
      trim(p_client_name), trim(p_client_phone), nullif(trim(p_client_email), ''),
      p_start_time, p_start_time + make_interval(mins => v_duration), 'scheduled', nullif(trim(p_notes), ''))
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Esse horário acabou de ser reservado. Escolha outro.';
  end;
  return v_id;
end;
$$;

revoke all on function public.get_booking_page(uuid) from public;
revoke all on function public.get_busy_slots(uuid, timestamptz, timestamptz) from public;
revoke all on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, text) from public;
grant execute on function public.get_booking_page(uuid) to anon, authenticated;
grant execute on function public.get_busy_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

-- updated_at ----------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger update_barbershops_updated_at before update on public.barbershops
  for each row execute function public.update_updated_at_column();
create trigger update_barbers_updated_at before update on public.barbers
  for each row execute function public.update_updated_at_column();
create trigger update_services_updated_at before update on public.services
  for each row execute function public.update_updated_at_column();
create trigger update_clients_updated_at before update on public.clients
  for each row execute function public.update_updated_at_column();
create trigger update_appointments_updated_at before update on public.appointments
  for each row execute function public.update_updated_at_column();

-- Perfil automático no cadastro ----------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Realtime (o painel atualiza a agenda sozinho) --------------------------------
alter publication supabase_realtime add table public.appointments;
