alter table public.user_follows
add column if not exists followed_user_id uuid references public.profiles(user_id) on delete cascade;

update public.user_follows follows
set followed_user_id = profile.user_id
from public.profiles profile
where follows.follow_type = 'profile'
  and follows.followed_user_id is null
  and lower(follows.follow_value) = lower(profile.username);

create unique index if not exists user_follows_profile_target_unique_idx
on public.user_follows(user_id, followed_user_id)
where follow_type = 'profile' and followed_user_id is not null;

create index if not exists user_follows_target_created_idx
on public.user_follows(followed_user_id, created_at desc)
where follow_type = 'profile' and followed_user_id is not null;

create or replace function public.resolve_profile_follow_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
  target_username text;
begin
  if new.follow_type <> 'profile' then
    new.followed_user_id := null;
    return new;
  end if;

  if new.followed_user_id is not null then
    select profile.user_id, profile.username
    into target_user_id, target_username
    from public.profiles profile
    where profile.user_id = new.followed_user_id
    limit 1;
  else
    select profile.user_id, profile.username
    into target_user_id, target_username
    from public.profiles profile
    where lower(profile.username) = lower(new.follow_value)
    limit 1;
  end if;

  if target_user_id is null then
    raise exception 'Perfil de destino inválido';
  end if;

  if target_user_id = new.user_id then
    raise exception 'Não é possível seguir o próprio perfil';
  end if;

  new.followed_user_id := target_user_id;
  new.follow_value := target_username;
  return new;
end;
$$;

revoke all on function public.resolve_profile_follow_target() from public, anon, authenticated;

drop trigger if exists user_follows_resolve_profile_target on public.user_follows;

create trigger user_follows_resolve_profile_target
before insert or update of follow_type, follow_value, followed_user_id on public.user_follows
for each row
execute function public.resolve_profile_follow_target();

create or replace function public.sync_profile_follow_usernames()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.username is distinct from old.username then
    update public.user_follows profile_follow
    set follow_value = new.username
    where profile_follow.follow_type = 'profile'
      and profile_follow.followed_user_id = new.user_id
      and profile_follow.follow_value is distinct from new.username
      and not exists (
        select 1
        from public.user_follows existing_follow
        where existing_follow.user_id = profile_follow.user_id
          and existing_follow.follow_type = 'profile'
          and existing_follow.follow_value = new.username
      );
  end if;

  return new;
end;
$$;

revoke all on function public.sync_profile_follow_usernames() from public, anon, authenticated;

drop trigger if exists profiles_sync_user_follow_username on public.profiles;

create trigger profiles_sync_user_follow_username
after update of username on public.profiles
for each row
when (old.username is distinct from new.username)
execute function public.sync_profile_follow_usernames();

create or replace function public.notify_profile_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_username text;
  should_notify boolean;
begin
  if new.follow_type <> 'profile' or new.followed_user_id is null then
    return new;
  end if;

  if new.followed_user_id = new.user_id then
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
  where preferences.user_id = new.followed_user_id;

  if not coalesce(should_notify, true) then
    return new;
  end if;

  if exists (
    select 1
    from public.notifications notification
    where notification.user_id = new.followed_user_id
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
    new.followed_user_id,
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

create or replace function public.current_user_follow_values()
returns table(follow_type text, follow_value text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    follows.follow_type,
    case
      when follows.follow_type = 'profile' then coalesce(profile.username, follows.follow_value)
      else follows.follow_value
    end as follow_value
  from public.user_follows follows
  left join public.profiles profile
    on profile.user_id = follows.followed_user_id
   and follows.follow_type = 'profile'
  where follows.user_id = (select auth.uid());
$$;

revoke all on function public.current_user_follow_values() from public;
grant execute on function public.current_user_follow_values() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
