-- Lower Sprityful's enforced daily generation limit from three to one.
-- Existing counts above one remain denied until the next UTC day.

create or replace function public.reserve_daily_generation(p_user_id uuid)
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
  v_limit constant integer := 1;
begin
  insert into public.generation_usage as usage (user_id, usage_date, generation_count)
  values (p_user_id, (timezone('utc', now()))::date, 1)
  on conflict (user_id, usage_date) do update
    set generation_count = usage.generation_count + 1
    where usage.generation_count < v_limit
  returning generation_count into v_count;

  if found then
    return query select true, v_count, greatest(0, v_limit - v_count);
    return;
  end if;

  select generation_count
  into v_count
  from public.generation_usage
  where user_id = p_user_id
    and usage_date = (timezone('utc', now()))::date;

  return query select false, least(coalesce(v_count, v_limit), v_limit), 0;
end;
$$;

revoke all on function public.reserve_daily_generation(uuid) from public, anon, authenticated;
grant execute on function public.reserve_daily_generation(uuid) to service_role;
