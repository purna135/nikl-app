-- Daily per-person limit for poster reading (Claude API calls cost money).
-- Server-only: the extract-event function calls bump_poster_ai_usage() with the service role.

create table public.poster_ai_usage (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  day      date not null,
  calls    integer not null default 0 check (calls >= 0),
  primary key (user_id, day)
);
alter table public.poster_ai_usage enable row level security;
revoke all on public.poster_ai_usage from anon, authenticated;

-- Adds one call for today (India time). Returns false, without counting, once the limit is reached.
create or replace function public.bump_poster_ai_usage(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  today  date := (now() at time zone 'Asia/Kolkata')::date;
  used   integer;
begin
  insert into public.poster_ai_usage (user_id, day, calls) values (p_user_id, today, 0)
  on conflict (user_id, day) do nothing;
  update public.poster_ai_usage set calls = calls + 1
   where user_id = p_user_id and day = today and calls < p_limit
  returning calls into used;
  return used is not null;
end;
$$;

revoke execute on function public.bump_poster_ai_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.bump_poster_ai_usage(uuid, integer) to service_role;
