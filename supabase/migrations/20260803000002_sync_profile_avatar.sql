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
