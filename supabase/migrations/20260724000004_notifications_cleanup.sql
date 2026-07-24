drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (auth.uid() = user_id);

grant delete on public.notifications to authenticated;

create or replace function public.prune_old_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where user_id = new.user_id
    and id in (
      select id
      from public.notifications
      where user_id = new.user_id
      order by created_at desc, id desc
      offset 100
    );

  return new;
end;
$$;

drop trigger if exists notifications_prune_after_insert on public.notifications;
create trigger notifications_prune_after_insert
after insert on public.notifications
for each row execute function public.prune_old_notifications();
