-- Store phone numbers in E.164 form (+919876543210), as decided in DECISIONS.md S3.
-- Supabase Auth keeps phones without the leading "+", so add it when copying to profiles_private.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'name', ''));
  insert into public.profiles_private (id, phone)
  values (
    new.id,
    case
      when new.phone is null or new.phone = '' then null
      when left(new.phone, 1) = '+' then new.phone
      else '+' || new.phone
    end
  );
  return new;
end;
$$;

-- Fix rows created before this migration
update public.profiles_private
set phone = '+' || phone
where phone is not null and phone <> '' and left(phone, 1) <> '+';

alter table public.profiles_private
  add constraint profiles_private_phone_e164 check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');
