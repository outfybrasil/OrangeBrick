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
    if TG_OP = 'UPDATE' and old.shared_post_id is not null and new.shared_post_id is null and new.user_id = old.user_id and new.content = old.content then
      return new;
    end if;
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
    if TG_OP = 'INSERT' then
      new.media_url := null;
    else
      new.media_url := old.media_url;
    end if;
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

create or replace function public.sync_profile_identity_to_community()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.avatar_url is distinct from old.avatar_url or new.display_name is distinct from old.display_name then
    update public.community_posts
    set author_avatar = coalesce(new.avatar_url, ''),
        author_name = new.display_name
    where user_id = new.user_id;

    update public.community_comments
    set author_avatar = coalesce(new.avatar_url, ''),
        author_name = new.display_name
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_profile_identity_to_community_trigger on public.profiles;
create trigger sync_profile_identity_to_community_trigger
after update of avatar_url, display_name on public.profiles
for each row execute function public.sync_profile_identity_to_community();

update public.community_posts community_post
set author_avatar = coalesce(profile.avatar_url, ''),
    author_name = profile.display_name
from public.profiles profile
where community_post.user_id = profile.user_id
  and (community_post.author_avatar is distinct from coalesce(profile.avatar_url, '') or community_post.author_name is distinct from profile.display_name);

update public.community_comments community_comment
set author_avatar = coalesce(profile.avatar_url, ''),
    author_name = profile.display_name
from public.profiles profile
where community_comment.user_id = profile.user_id
  and (community_comment.author_avatar is distinct from coalesce(profile.avatar_url, '') or community_comment.author_name is distinct from profile.display_name);
