alter table public.community_posts add column if not exists author_username text;
alter table public.community_comments add column if not exists author_username text;

update public.community_posts community_post
set author_username = profile.username
from public.profiles profile
where community_post.user_id = profile.user_id and community_post.author_username is null;

update public.community_comments community_comment
set author_username = profile.username
from public.profiles profile
where community_comment.user_id = profile.user_id and community_comment.author_username is null;

create or replace function public.sync_profile_identity_to_community()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.avatar_url is distinct from old.avatar_url or new.display_name is distinct from old.display_name or new.username is distinct from old.username then
    update public.community_posts
    set author_avatar = coalesce(new.avatar_url, ''),
        author_name = new.display_name,
        author_username = new.username
    where user_id = new.user_id;

    update public.community_comments
    set author_avatar = coalesce(new.avatar_url, ''),
        author_name = new.display_name,
        author_username = new.username
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_profile_identity_to_community_trigger on public.profiles;
create trigger sync_profile_identity_to_community_trigger
after update of avatar_url, display_name, username on public.profiles
for each row execute function public.sync_profile_identity_to_community();

create index if not exists community_posts_author_username_idx on public.community_posts(author_username);
