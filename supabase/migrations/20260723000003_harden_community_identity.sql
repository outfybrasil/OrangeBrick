create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'role' = 'service_role', false)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
$$;

alter table public.profiles
add column if not exists is_official boolean not null default false;

alter table public.community_posts
add column if not exists is_official boolean not null default false;

alter table public.community_comments
add column if not exists is_official boolean not null default false;

update public.profiles profile
set is_official = true
from auth.users account
where profile.user_id = account.id
  and coalesce((account.raw_app_meta_data ->> 'is_admin')::boolean, false);

update public.community_posts post
set is_official = true
from auth.users account
where post.user_id = account.id
  and coalesce((account.raw_app_meta_data ->> 'is_admin')::boolean, false);

update public.community_comments comment
set is_official = true
from auth.users account
where comment.user_id = account.id
  and coalesce((account.raw_app_meta_data ->> 'is_admin')::boolean, false);

create or replace function public.profile_enforce_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role' = 'service_role', false) then
    return new;
  end if;

  if auth.uid() is null or (new.user_id <> auth.uid() and not public.current_user_is_admin()) then
    raise exception 'Perfil não autorizado';
  end if;

  new.nickname := btrim(new.nickname);
  new.is_official := public.current_user_is_admin();

  if regexp_replace(lower(new.nickname), '[^a-z0-9]', '', 'g') = 'orangebrick'
     and not public.current_user_is_admin() then
    raise exception 'Nome reservado';
  end if;

  if new.avatar_url is not null
     and new.avatar_url !~ '^https://'
     and new.avatar_url !~ '^/' then
    raise exception 'URL de avatar inválida';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_identity on public.profiles;
create trigger profiles_enforce_identity
before insert or update on public.profiles
for each row execute function public.profile_enforce_identity();

create or replace function public.community_enforce_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_name text;
  verified_avatar text;
  source_post public.community_posts%rowtype;
  source_article public.posts%rowtype;
begin
  if coalesce(auth.jwt() ->> 'role' = 'service_role', false) then
    return new;
  end if;

  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Publicação não autorizada';
  end if;

  select nickname, coalesce(avatar_url, '')
  into verified_name, verified_avatar
  from public.profiles
  where user_id = new.user_id;

  if verified_name is null then
    raise exception 'Complete o perfil antes de publicar';
  end if;

  new.author_name := verified_name;
  new.author_avatar := verified_avatar;
  new.is_official := public.current_user_is_admin();

  if not public.current_user_is_admin() then
    new.is_pinned := false;
    new.media_url := null;
  end if;

  if new.media_url is not null and new.media_url !~ '^https://' then
    raise exception 'URL de mídia inválida';
  end if;

  if new.attached_article is not null and new.attached_article ? '_type' then
    select *
    into source_post
    from public.community_posts
    where id = (new.attached_article ->> 'original_post_id')::uuid;

    if source_post.id is null then
      raise exception 'Publicação compartilhada não encontrada';
    end if;

    new.shared_post_id := source_post.id;
    new.attached_article := jsonb_build_object(
      '_type', 'shared_post',
      'original_post_id', source_post.id,
      'original_author_name', source_post.author_name,
      'original_author_avatar', source_post.author_avatar,
      'original_is_official', source_post.is_official,
      'original_content', source_post.content,
      'original_created_at', source_post.created_at,
      'original_platform_tag', source_post.platform_tag,
      'original_attached_article', source_post.attached_article
    );
  elsif new.attached_article is not null then
    select *
    into source_article
    from public.posts
    where id = (new.attached_article ->> 'id')::uuid
      and is_published = true;

    if source_article.id is null then
      raise exception 'Matéria anexada não encontrada';
    end if;

    new.attached_article := jsonb_build_object(
      'id', source_article.id,
      'slug', source_article.slug,
      'title', source_article.title,
      'summary', source_article.summary,
      'image_url', source_article.image_url,
      'category', source_article.category
    );
  end if;

  return new;
end;
$$;

drop trigger if exists community_posts_enforce_author on public.community_posts;
create trigger community_posts_enforce_author
before insert or update on public.community_posts
for each row execute function public.community_enforce_author();

create or replace function public.community_comment_enforce_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role' = 'service_role', false) then
    return new;
  end if;

  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Comentário não autorizado';
  end if;

  select nickname, coalesce(avatar_url, '')
  into new.author_name, new.author_avatar
  from public.profiles
  where user_id = new.user_id;

  if new.author_name is null then
    raise exception 'Complete o perfil antes de comentar';
  end if;

  new.is_official := public.current_user_is_admin();

  return new;
end;
$$;

drop trigger if exists community_comments_enforce_author on public.community_comments;
create trigger community_comments_enforce_author
before insert or update on public.community_comments
for each row execute function public.community_comment_enforce_author();

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
  select nickname into actor_name
  from public.profiles
  where user_id = new.user_id;

  if tg_table_name = 'community_reactions' then
    select user_id into recipient_id from public.community_posts where id = new.post_id;
    notification_type := 'reaction';
    notification_message := actor_name || ' reagiu ao seu Brick';
    notification_reference_type := 'post';
    notification_reference_id := new.post_id::text;
  elsif tg_table_name = 'community_comments' then
    select user_id into recipient_id from public.community_posts where id = new.post_id;
    notification_type := 'comment';
    notification_message := actor_name || ' respondeu ao seu Brick';
    notification_reference_type := 'post';
    notification_reference_id := new.post_id::text;
  elsif tg_table_name = 'community_comment_likes' then
    select user_id into recipient_id from public.community_comments where id = new.comment_id;
    notification_type := 'reaction';
    notification_message := actor_name || ' curtiu sua resposta';
    notification_reference_type := 'comment';
    notification_reference_id := new.comment_id::text;
  elsif tg_table_name = 'community_posts' and new.shared_post_id is not null then
    select user_id into recipient_id from public.community_posts where id = new.shared_post_id;
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

create or replace function public.community_validate_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_poll public.community_polls%rowtype;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Voto não autorizado';
  end if;

  select * into selected_poll
  from public.community_polls
  where id = new.poll_id;

  if selected_poll.id is null
     or (selected_poll.expires_at is not null and selected_poll.expires_at <= now())
     or not exists (
       select 1
       from jsonb_array_elements(selected_poll.options) option
       where (option ->> 'id')::int = new.option_index
     ) then
    raise exception 'Opção de enquete inválida';
  end if;

  return new;
end;
$$;

drop trigger if exists community_poll_votes_validate on public.community_poll_votes;
create trigger community_poll_votes_validate
before insert on public.community_poll_votes
for each row execute function public.community_validate_poll_vote();

drop policy if exists notifications_insert on public.notifications;
revoke insert on public.notifications from anon, authenticated;
revoke execute on function public.current_user_is_admin() from public, anon, authenticated;
