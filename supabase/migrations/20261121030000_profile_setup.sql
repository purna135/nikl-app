-- Profile set-up after the first login: name, username, area, interests and year of birth.
-- Year of birth is private (profiles_private) and enforces the 18+ rule (DECISIONS.md P11), so the
-- whole set-up goes through this function instead of direct writes.
-- Note: with only a birth year, someone turning 18 later this year passes a few months early.

create or replace function public.complete_profile(
  p_name       text,
  p_username   text,
  p_area       text,
  p_interests  text[],
  p_dob_year   integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid        uuid := auth.uid();
  this_year  integer := extract(year from (now() at time zone 'Asia/Kolkata'))::integer;
  uname      text := lower(trim(coalesce(p_username, '')));
begin
  if uid is null then
    raise exception 'Log in first.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 60 then
    raise exception 'Enter your name.' using errcode = '22023';
  end if;
  if uname !~ '^[a-z0-9._]{3,24}$' or uname like '.%' or uname like '%.' or uname like '%..%' then
    raise exception 'Use 3–24 letters, numbers, dots or underscores for your username.' using errcode = '22023';
  end if;
  if p_dob_year is null or p_dob_year < this_year - 100 or p_dob_year > this_year - 18 then
    raise exception 'You need to be 18 or older to use Nikl.' using errcode = '22023';
  end if;
  if (select count(distinct i) from unnest(coalesce(p_interests, '{}')) i) < 3 or cardinality(p_interests) > 12 then
    raise exception 'Pick at least 3 things you''re into.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_interests) i where not public.is_valid_category(i)) then
    raise exception 'Pick your interests from the list.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_area, '')) > 40 then
    raise exception 'Pick an area from the list.' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles p where lower(p.username) = uname and p.id <> uid) then
    raise exception 'That username is taken. Try another one.' using errcode = '23505';
  end if;

  update public.profiles
     set name = trim(p_name), username = uname, area = nullif(trim(p_area), ''),
         interests = (select array_agg(distinct i) from unnest(p_interests) i)
   where id = uid;
  update public.profiles_private set dob_year = p_dob_year where id = uid;
end;
$$;

revoke execute on function public.complete_profile(text, text, text, text[], integer) from public, anon;
grant execute on function public.complete_profile(text, text, text, text[], integer) to authenticated;
