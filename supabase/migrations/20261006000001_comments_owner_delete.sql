revoke delete on table public.comments from public, anon, authenticated;
grant delete on table public.comments to authenticated;

drop policy if exists comments_owner_delete on public.comments;
create policy comments_owner_delete on public.comments
  for delete to authenticated
  using (auth.uid() = user_id);
