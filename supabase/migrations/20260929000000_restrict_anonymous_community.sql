create or replace function public.authenticated_user_is_human()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true'
$$;

revoke all on function public.authenticated_user_is_human() from public, anon, authenticated;
grant execute on function public.authenticated_user_is_human() to authenticated;

create or replace function public.assert_community_participation_allowed(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
begin
  if not public.authenticated_user_is_human() then
    raise exception 'Contas anônimas não podem participar do Brickboard.';
  end if;

  select * into target_profile
  from public.profiles
  where user_id = target_user_id;

  if coalesce(target_profile.community_banned, false) then
    raise exception 'Sua participação no Brickboard foi bloqueada pela moderação.';
  end if;

  if target_profile.community_suspended_until is not null
     and target_profile.community_suspended_until > now() then
    raise exception 'Sua participação no Brickboard está suspensa até %.',
      to_char(target_profile.community_suspended_until at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
  end if;
end;
$$;

revoke all on function public.assert_community_participation_allowed(uuid) from public, anon, authenticated;
grant execute on function public.assert_community_participation_allowed(uuid) to authenticated;

create or replace function public.report_community_content(
  target_type text,
  target_id uuid,
  target_reason text default 'Conteúdo inadequado'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
  owner_id uuid;
begin
  if current_id is null then raise exception 'Autenticação necessária'; end if;
  if not public.authenticated_user_is_human() then raise exception 'Contas anônimas não podem denunciar conteúdo.'; end if;
  if target_type not in ('post', 'comment') then raise exception 'Tipo de conteúdo inválido'; end if;

  if target_type = 'post' then
    select user_id into owner_id from public.community_posts where id = target_id;
  else
    select user_id into owner_id from public.community_comments where id = target_id;
  end if;

  if owner_id is null then raise exception 'Conteúdo não encontrado'; end if;
  if owner_id = current_id then raise exception 'Você não pode denunciar seu próprio conteúdo'; end if;

  insert into public.community_reports (reporter_id, content_type, content_id, reason)
  values (current_id, target_type, target_id, left(btrim(target_reason), 280))
  on conflict (reporter_id, content_type, content_id) do nothing;
end;
$$;

revoke all on function public.report_community_content(text, uuid, text) from public, anon, authenticated;
grant execute on function public.report_community_content(text, uuid, text) to authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'community_posts',
    'community_reactions',
    'community_comments',
    'community_poll_votes',
    'community_comment_likes',
    'community_reports',
    'community_notes',
    'community_note_votes',
    'comments',
    'article_comment_likes',
    'game_clubs',
    'game_club_members'
  ] loop
    if to_regclass('public.' || target_table) is null then continue; end if;
    execute format('drop policy if exists authenticated_human_users_only on public.%I', target_table);
    execute format(
      'create policy authenticated_human_users_only on public.%I as restrictive for all to authenticated using ((select public.authenticated_user_is_human())) with check ((select public.authenticated_user_is_human()))',
      target_table
    );
  end loop;
end;
$$;
