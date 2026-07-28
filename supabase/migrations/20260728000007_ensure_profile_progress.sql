create or replace function public.ensure_profile_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_progress (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_progress on public.profiles;
create trigger profiles_ensure_progress
after insert on public.profiles
for each row execute function public.ensure_profile_progress();

insert into public.user_progress (user_id)
select profile.user_id
from public.profiles profile
on conflict (user_id) do nothing;
