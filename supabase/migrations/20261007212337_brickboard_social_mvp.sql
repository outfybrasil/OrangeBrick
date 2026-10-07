grant select on public.user_follows to anon, authenticated;

drop policy if exists public_profile_follows_are_readable on public.user_follows;

create policy public_profile_follows_are_readable
on public.user_follows
for select
to anon, authenticated
using (follow_type = 'profile');

alter table public.notification_preferences
add column if not exists brickboard_follows boolean not null default true;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type = any (array['reaction'::text, 'comment'::text, 'reply'::text, 'system'::text, 'follow'::text]));

create or replace function public.notify_profile_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient_user_id uuid;
  actor_username text;
  should_notify boolean;
begin
  if new.follow_type <> 'profile' then
    return new;
  end if;

  select profile.user_id
  into recipient_user_id
  from public.profiles profile
  where lower(profile.username) = lower(new.follow_value)
  limit 1;

  if recipient_user_id is null or recipient_user_id = new.user_id then
    return new;
  end if;

  select profile.username
  into actor_username
  from public.profiles profile
  where profile.user_id = new.user_id
  limit 1;

  if actor_username is null then
    return new;
  end if;

  select preferences.brickboard_follows
  into should_notify
  from public.notification_preferences preferences
  where preferences.user_id = recipient_user_id;

  if not coalesce(should_notify, true) then
    return new;
  end if;

  if exists (
    select 1
    from public.notifications notification
    where notification.user_id = recipient_user_id
      and notification.actor_id = new.user_id
      and notification.type = 'follow'
      and notification.reference_type = 'profile'
      and notification.reference_id = actor_username
      and notification.created_at > now() - interval '24 hours'
  ) then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    message,
    reference_type,
    reference_id
  )
  values (
    recipient_user_id,
    new.user_id,
    'follow',
    '@' || actor_username || ' começou a seguir você.',
    'profile',
    actor_username
  );

  return new;
end;
$$;

revoke all on function public.notify_profile_follow() from public, anon, authenticated;

drop trigger if exists user_follows_notify_profile on public.user_follows;

create trigger user_follows_notify_profile
after insert on public.user_follows
for each row
when (new.follow_type = 'profile')
execute function public.notify_profile_follow();

notify pgrst, 'reload schema';
