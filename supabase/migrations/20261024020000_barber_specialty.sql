-- Barber Pro: especialidade do barbeiro (ex.: "Degradê & Fade")
alter table public.barbers add column if not exists specialty text;
