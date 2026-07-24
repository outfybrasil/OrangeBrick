alter table public.push_subscriptions
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists push_subscriptions_user_id_idx
on public.push_subscriptions (user_id)
where user_id is not null;

create or replace function public.community_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  actor_name text;
  notification_type text;
  notification_message text;
  notification_reference_type text;
  notification_reference_id text;
begin
  select coalesce(nullif(btrim(nickname), ''), 'Alguém')
  into actor_name
  from public.profiles
  where user_id = new.user_id;

  actor_name := coalesce(actor_name, 'Alguém');

  if tg_table_name = 'community_reactions' then
    select user_id into recipient_id
    from public.community_posts
    where id = new.post_id;
    notification_type := 'reaction';
    notification_message := actor_name || ' reagiu ao seu Brick';
    notification_reference_type := 'post';
    notification_reference_id := new.post_id::text;
  elsif tg_table_name = 'community_comments' then
    select user_id into recipient_id
    from public.community_posts
    where id = new.post_id;
    notification_type := 'comment';
    notification_message := actor_name || ' comentou no seu Brick';
    notification_reference_type := 'post';
    notification_reference_id := new.post_id::text;
  elsif tg_table_name = 'community_comment_likes' then
    select user_id into recipient_id
    from public.community_comments
    where id = new.comment_id;
    notification_type := 'reaction';
    notification_message := actor_name || ' curtiu seu comentário';
    notification_reference_type := 'comment';
    notification_reference_id := new.comment_id::text;
  elsif tg_table_name = 'community_posts' and new.shared_post_id is not null then
    select user_id into recipient_id
    from public.community_posts
    where id = new.shared_post_id;
    notification_type := 'comment';
    notification_message := actor_name || ' republicou seu Brick';
    notification_reference_type := 'post';
    notification_reference_id := new.shared_post_id::text;
  end if;

  if recipient_id is not null and recipient_id <> new.user_id then
    insert into public.notifications (
      user_id,
      actor_id,
      type,
      message,
      reference_type,
      reference_id
    )
    values (
      recipient_id,
      new.user_id,
      notification_type,
      notification_message,
      notification_reference_type,
      notification_reference_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists community_reactions_notify on public.community_reactions;
create trigger community_reactions_notify
after insert on public.community_reactions
for each row execute function public.community_notify();

drop trigger if exists community_comments_notify on public.community_comments;
create trigger community_comments_notify
after insert on public.community_comments
for each row execute function public.community_notify();

drop trigger if exists community_comment_likes_notify on public.community_comment_likes;
create trigger community_comment_likes_notify
after insert on public.community_comment_likes
for each row execute function public.community_notify();

drop trigger if exists community_posts_notify on public.community_posts;
create trigger community_posts_notify
after insert on public.community_posts
for each row execute function public.community_notify();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end
$$;
