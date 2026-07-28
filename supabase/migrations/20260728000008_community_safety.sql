create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('post', 'comment')),
  content_id uuid not null,
  reason text not null default 'Conteúdo inadequado' check (char_length(reason) between 3 and 280),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (reporter_id, content_type, content_id)
);

create index if not exists community_reports_status_idx
on public.community_reports (status, created_at desc);

alter table public.community_reports enable row level security;

create policy community_reports_own_read on public.community_reports
for select to authenticated
using (reporter_id = auth.uid() or public.current_user_is_admin());

create policy community_reports_own_insert on public.community_reports
for insert to authenticated
with check (reporter_id = auth.uid());

create policy community_reports_admin_update on public.community_reports
for update to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

grant select, insert, update on public.community_reports to authenticated;

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

grant execute on function public.report_community_content(text, uuid, text) to authenticated;

create or replace function public.enforce_community_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_total integer;
  daily_limit integer;
begin
  if coalesce(auth.jwt() ->> 'role' = 'service_role', false) or public.current_user_is_admin() then
    return new;
  end if;
  if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'Ação não autorizada'; end if;

  daily_limit := case TG_TABLE_NAME
    when 'community_posts' then 10
    when 'community_comments' then 40
    when 'community_reactions' then 100
    when 'community_comment_likes' then 100
    else 0
  end;

  execute format(
    'select count(*) from public.%I where user_id = $1 and created_at >= date_trunc(''day'', now() at time zone ''America/Sao_Paulo'') at time zone ''America/Sao_Paulo''',
    TG_TABLE_NAME
  )
  into daily_total
  using new.user_id;

  if daily_total >= daily_limit then
    raise exception 'Limite diário de participação atingido';
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_daily_limit on public.community_posts;
create trigger community_posts_daily_limit
before insert on public.community_posts
for each row execute function public.enforce_community_daily_limit();

drop trigger if exists community_comments_daily_limit on public.community_comments;
create trigger community_comments_daily_limit
before insert on public.community_comments
for each row execute function public.enforce_community_daily_limit();

drop trigger if exists community_reactions_daily_limit on public.community_reactions;
create trigger community_reactions_daily_limit
before insert on public.community_reactions
for each row execute function public.enforce_community_daily_limit();

drop trigger if exists community_comment_likes_daily_limit on public.community_comment_likes;
create trigger community_comment_likes_daily_limit
before insert on public.community_comment_likes
for each row execute function public.enforce_community_daily_limit();
