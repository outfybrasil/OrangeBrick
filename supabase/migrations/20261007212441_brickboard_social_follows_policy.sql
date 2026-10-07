drop policy if exists reader_follows_owner on public.user_follows;
drop policy if exists public_profile_follows_are_readable on public.user_follows;

create policy user_follows_readable
on public.user_follows
for select
to anon, authenticated
using (follow_type = 'profile' or (select auth.uid()) = user_id);

create policy user_follows_insert_owner
on public.user_follows
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy user_follows_update_owner
on public.user_follows
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy user_follows_delete_owner
on public.user_follows
for delete
to authenticated
using ((select auth.uid()) = user_id);
