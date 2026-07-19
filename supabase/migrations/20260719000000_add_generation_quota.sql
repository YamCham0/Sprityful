-- Server-only, atomic daily generation reservations for Sprityful.
-- This migration intentionally exposes neither the table nor the RPC to browser roles.

create table if not exists public.generation_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  generation_count integer not null default 0 check (generation_count between 0 and 7),
  primary key (user_id, usage_date)
);

alter table public.generation_usage enable row level security;

revoke all on table public.generation_usage from public, anon, authenticated;
grant select, insert, update on table public.generation_usage to service_role;

create or replace function public.reserve_daily_generation(p_user_id uuid)
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.generation_usage as usage (user_id, usage_date, generation_count)
  values (p_user_id, (timezone('utc', now()))::date, 1)
  on conflict (user_id, usage_date) do update
    set generation_count = usage.generation_count + 1
    where usage.generation_count < 7
  returning generation_count into v_count;

  if found then
    return query select true, v_count, greatest(0, 7 - v_count);
    return;
  end if;

  select generation_count
  into v_count
  from public.generation_usage
  where user_id = p_user_id
    and usage_date = (timezone('utc', now()))::date;

  return query select false, coalesce(v_count, 7), 0;
end;
$$;

revoke all on function public.reserve_daily_generation(uuid) from public, anon, authenticated;
grant execute on function public.reserve_daily_generation(uuid) to service_role;
