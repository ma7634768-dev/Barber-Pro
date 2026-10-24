-- Barber Pro: produtos (pomadas, shampoos etc.) vendidos na barbearia

create table public.products (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  stock integer check (stock is null or stock >= 0),
  image_url text,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_barbershop_id_idx on public.products(barbershop_id);

alter table public.products enable row level security;
create policy "Owners manage their products" on public.products
  for all using (public.owns_barbershop(barbershop_id)) with check (public.owns_barbershop(barbershop_id));

create trigger update_products_updated_at before update on public.products
  for each row execute function public.update_updated_at_column();

-- A página pública passa a mostrar os produtos ativos (sem o estoque)
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
      from services s where s.barbershop_id = b.id and s.is_active), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'description', p.description,
        'price', p.price, 'image_url', p.image_url, 'category', p.category,
        'in_stock', p.stock is null or p.stock > 0)
        order by p.category nulls last, p.name)
      from products p where p.barbershop_id = b.id and p.is_active), '[]'::jsonb)
  )
  from barbershops b where b.id = p_barbershop_id;
$$;
