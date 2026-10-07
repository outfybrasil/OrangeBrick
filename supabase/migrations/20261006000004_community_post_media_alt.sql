begin;

alter table public.community_posts
  add column if not exists media_alt text;

create or replace function public.require_community_post_media_alt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.media_url is null then
    new.media_alt := null;
    return new;
  end if;

  new.media_alt := nullif(btrim(new.media_alt), '');
  if new.media_alt is null then
    raise exception 'Descreva a imagem antes de publicar.' using errcode = '23514';
  end if;

  if char_length(new.media_alt) > 300 then
    raise exception 'A descrição da imagem deve ter até 300 caracteres.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.require_community_post_media_alt() from public, anon, authenticated;

drop trigger if exists community_posts_require_media_alt on public.community_posts;
create trigger community_posts_require_media_alt
before insert or update of media_url, media_alt on public.community_posts
for each row execute function public.require_community_post_media_alt();

notify pgrst, 'reload schema';

commit;
