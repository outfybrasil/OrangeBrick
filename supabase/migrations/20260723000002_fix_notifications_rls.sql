drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (true);

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, update, insert on public.notifications to authenticated;
