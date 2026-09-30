alter table public.community_moderation_actions
  alter column moderator_id drop not null;

create or replace function public.delete_user_account_data(
  p_user_id uuid,
  p_device_id text default null,
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Acesso negado.';
  end if;

  if p_user_id is null then
    raise exception using errcode = '22023', message = 'O identificador da conta é obrigatório.';
  end if;

  update public.community_moderation_actions
     set moderator_id = null
   where moderator_id = p_user_id;

  delete from public.community_comment_likes where user_id = p_user_id;
  delete from public.community_poll_votes where user_id = p_user_id;
  delete from public.community_reactions where user_id = p_user_id;
  delete from public.community_comments where user_id = p_user_id;
  delete from public.community_posts where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.comments where user_id = p_user_id;
  delete from public.push_subscriptions where user_id = p_user_id;

  if p_device_id ~ '^[a-f0-9]{32}$' then
    delete from public.reactions where device_id = p_device_id;
    delete from public.post_views where device_id = p_device_id;
  end if;

  if p_email is not null and btrim(p_email) <> '' then
    delete from public.contact_submissions where lower(email) = lower(btrim(p_email));
    delete from public.newsletter_subscribers where lower(email) = lower(btrim(p_email));
  end if;

  delete from public.profiles where user_id = p_user_id;
end;
$$;

revoke all on function public.delete_user_account_data(uuid, text, text) from public, anon, authenticated;
grant execute on function public.delete_user_account_data(uuid, text, text) to service_role;
