-- Add UPDATE policy for community_reactions (users change their reaction type)
drop policy if exists community_reactions_update on public.community_reactions;
create policy community_reactions_update on public.community_reactions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update on public.community_reactions to authenticated;

-- Add shared_post_id column for future native repost support (optional, repost works via JSONB)
alter table public.community_posts
add column if not exists shared_post_id uuid references public.community_posts(id) on delete set null;
