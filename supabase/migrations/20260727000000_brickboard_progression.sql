create or replace function public.normalize_username(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(value, '')),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

alter table public.profiles
add column if not exists username text,
add column if not exists display_name text,
add column if not exists favorite_platforms text[] not null default '{}',
add column if not exists favorite_categories text[] not null default '{}',
add column if not exists equipped_title text,
add column if not exists equipped_frame text,
add column if not exists profile_theme text not null default 'default',
add column if not exists show_lifetime_xp boolean not null default true,
add column if not exists show_activity_stats boolean not null default true,
add column if not exists show_season_history boolean not null default true,
add column if not exists show_in_leaderboard boolean not null default true;

update public.profiles
set display_name = coalesce(nullif(btrim(display_name), ''), nickname)
where display_name is null or btrim(display_name) = '';

do $$
declare
  profile_row record;
  candidate text;
  suffix integer;
begin
  for profile_row in
    select id, nickname
    from public.profiles
    where username is null or btrim(username) = ''
    order by created_at, id
  loop
    candidate := public.normalize_username(profile_row.nickname);
    if char_length(candidate) < 3 then
      candidate := 'leitor';
    end if;
    suffix := 1;
    while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
      suffix := suffix + 1;
      candidate := left(public.normalize_username(profile_row.nickname), 24) || '-' || suffix::text;
    end loop;
    update public.profiles set username = candidate where id = profile_row.id;
  end loop;
end;
$$;

alter table public.profiles
alter column username set not null,
alter column display_name set not null;

create unique index if not exists profiles_username_unique_idx on public.profiles (lower(username));
create index if not exists profiles_user_id_idx on public.profiles (user_id);

create or replace function public.profile_enforce_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role' = 'service_role', false) then
    return new;
  end if;

  if auth.uid() is null or (new.user_id <> auth.uid() and not public.current_user_is_admin()) then
    raise exception 'Perfil não autorizado';
  end if;

  new.display_name := btrim(coalesce(nullif(new.display_name, ''), new.nickname));
  new.nickname := new.display_name;
  new.username := public.normalize_username(coalesce(nullif(new.username, ''), new.display_name));
  new.is_official := public.current_user_is_admin();

  if char_length(new.display_name) < 2 or char_length(new.display_name) > 30 then
    raise exception 'Nome deve ter entre 2 e 30 caracteres';
  end if;
  if char_length(new.username) < 3 or char_length(new.username) > 30 then
    raise exception 'Usuário deve ter entre 3 e 30 caracteres';
  end if;
  if new.username in ('admin', 'api', 'auth', 'brickboard', 'configuracoes', 'orange-brick', 'orangebrick', 'perfil', 'profile') and not public.current_user_is_admin() then
    raise exception 'Nome de usuário reservado';
  end if;
  if new.avatar_url is not null and new.avatar_url !~ '^https://' and new.avatar_url !~ '^/' then
    raise exception 'URL de avatar inválida';
  end if;

  return new;
end;
$$;

create table if not exists public.xp_rules (
  event_type text primary key,
  actor_xp integer not null default 0,
  recipient_xp integer not null default 0,
  daily_limit integer,
  minimum_content_length integer not null default 0,
  enabled boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.xp_rules (event_type, actor_xp, recipient_xp, daily_limit, minimum_content_length)
values
  ('post_created', 10, 0, 3, 20),
  ('comment_created', 5, 0, 10, 12),
  ('comment_received', 0, 5, 10, 0),
  ('reaction_given', 1, 0, 15, 0),
  ('reaction_received', 0, 2, 20, 0),
  ('comment_like_received', 0, 2, 15, 0),
  ('poll_voted', 3, 0, 1, 0),
  ('post_shared', 4, 6, 3, 20),
  ('editorial_highlight', 0, 50, 1, 0),
  ('weekly_active_3', 20, 0, 1, 0),
  ('weekly_active_5', 30, 0, 1, 0),
  ('admin_adjustment', 0, 0, null, 0)
on conflict (event_type) do update
set actor_xp = excluded.actor_xp,
    recipient_xp = excluded.recipient_xp,
    daily_limit = excluded.daily_limit,
    minimum_content_length = excluded.minimum_content_length,
    updated_at = now();

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('draft', 'calibration', 'active', 'calculating', 'completed')),
  rules_version integer not null default 1,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

insert into public.seasons (name, slug, starts_at, ends_at, status)
values (
  'Calibração Fundadores',
  'calibracao-fundadores-2026',
  '2026-07-27 00:00:00-03',
  '2026-09-15 23:59:59-03',
  'calibration'
)
on conflict (slug) do nothing;

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lifetime_xp bigint not null default 0 check (lifetime_xp >= 0),
  level integer not null default 1 check (level >= 1),
  active_days integer not null default 0 check (active_days >= 0),
  last_xp_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.initialize_user_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.is_official then
    insert into public.user_progress (user_id) values (new.user_id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_initialize_progress on public.profiles;
create trigger profiles_initialize_progress
after insert on public.profiles
for each row execute function public.initialize_user_progress();

create table if not exists public.season_progress (
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  eligible_xp bigint not null default 0 check (eligible_xp >= 0),
  active_days integer not null default 0 check (active_days >= 0),
  division text,
  rank integer,
  percentile numeric(5,2),
  is_qualified boolean not null default false,
  is_disqualified boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

create index if not exists season_progress_ranking_idx
on public.season_progress (season_id, is_qualified, is_disqualified, eligible_xp desc);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null references public.xp_rules(event_type),
  source_type text not null,
  source_id text not null,
  actor_id uuid references auth.users(id) on delete set null,
  xp_amount integer not null,
  status text not null default 'valid' check (status in ('valid', 'revoked', 'held')),
  season_id uuid references public.seasons(id) on delete set null,
  event_key text not null unique,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text
);

create index if not exists xp_events_user_time_idx on public.xp_events (user_id, occurred_at desc);
create index if not exists xp_events_daily_limit_idx on public.xp_events (user_id, event_type, occurred_at);
create index if not exists xp_events_source_idx on public.xp_events (source_type, source_id);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('title', 'avatar_frame', 'profile_theme', 'showcase_slot')),
  slug text not null unique,
  name text not null,
  asset_key text,
  required_level integer,
  is_seasonal boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.rewards (type, slug, name, required_level)
values
  ('showcase_slot', 'vitrine-um', 'Primeiro espaço da vitrine', 3),
  ('title', 'na-parede', 'Na Parede', 5),
  ('avatar_frame', 'encaixe-basico', 'Encaixe Básico', 10),
  ('showcase_slot', 'vitrine-dois', 'Segundo espaço da vitrine', 15),
  ('profile_theme', 'carvao', 'Carvão', 20),
  ('title', 'voz-da-comunidade', 'Voz da Comunidade', 25),
  ('showcase_slot', 'vitrine-tres', 'Terceiro espaço da vitrine', 30),
  ('avatar_frame', 'aco-prensado', 'Aço Prensado', 40),
  ('profile_theme', 'fornalha', 'Fornalha', 50)
on conflict (slug) do nothing;

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null check (category in ('participation', 'quality', 'exploration', 'community', 'legacy')),
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  is_hidden boolean not null default false,
  is_active boolean not null default true,
  criteria jsonb not null,
  reward_id uuid references public.rewards(id) on delete set null,
  sort_order integer not null default 0
);

insert into public.achievements (slug, name, description, category, rarity, criteria, sort_order)
values
  ('primeiro-tijolo', 'Primeiro Tijolo', 'Publique seu primeiro Brick.', 'participation', 'common', '{"metric":"posts","target":1}', 10),
  ('entrou-na-conversa', 'Entrou na Conversa', 'Faça seu primeiro comentário.', 'participation', 'common', '{"metric":"comments","target":1}', 20),
  ('puxou-uma-cadeira', 'Puxou uma Cadeira', 'Participe em 10 dias diferentes.', 'participation', 'uncommon', '{"metric":"active_days","target":10}', 30),
  ('parte-da-parede', 'Parte da Parede', 'Participe em 100 dias diferentes.', 'participation', 'epic', '{"metric":"active_days","target":100}', 40),
  ('acertou-em-cheio', 'Acertou em Cheio', 'Receba 25 reações em um único Brick.', 'quality', 'rare', '{"metric":"single_post_reactions","target":25}', 50),
  ('virou-debate', 'Virou Debate', 'Gere 15 comentários em um único Brick.', 'quality', 'rare', '{"metric":"single_post_comments","target":15}', 60),
  ('valeu-a-leitura', 'Valeu a Leitura', 'Receba 100 curtidas em seus comentários.', 'quality', 'epic', '{"metric":"comment_likes_received","target":100}', 70),
  ('multiplataforma', 'Multiplataforma', 'Participe de conversas sobre quatro plataformas.', 'exploration', 'uncommon', '{"metric":"platforms","target":4}', 80),
  ('na-pauta', 'Na Pauta', 'Participe de dez tópicos oficiais.', 'exploration', 'rare', '{"metric":"official_topics","target":10}', 90),
  ('voto-contado', 'Voto Contado', 'Responda a 25 perguntas do dia.', 'exploration', 'uncommon', '{"metric":"poll_votes","target":25}', 100),
  ('boa-conversa', 'Boa Conversa', 'Troque respostas com dez leitores diferentes.', 'community', 'uncommon', '{"metric":"distinct_readers","target":10}', 110),
  ('passou-adiante', 'Passou Adiante', 'Compartilhe dez Bricks com contexto próprio.', 'community', 'rare', '{"metric":"shares","target":10}', 120),
  ('veterano-brickboard', 'Veterano do Brickboard', 'Complete um ano de conta com atividade válida.', 'legacy', 'epic', '{"metric":"account_days","target":365}', 130),
  ('fundador-brickboard', 'Fundador do Brickboard', 'Esteve aqui antes do sistema de progressão.', 'legacy', 'legendary', '{"metric":"founder","target":1}', 140)
on conflict (slug) do nothing;

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  progress integer not null default 0,
  target integer not null default 1,
  unlocked_at timestamptz,
  notified_at timestamptz,
  is_equipped boolean not null default false,
  equipped_order integer,
  primary key (user_id, achievement_id)
);

create unique index if not exists user_achievements_equipped_order_idx
on public.user_achievements (user_id, equipped_order)
where is_equipped = true;

create table if not exists public.user_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  source_type text not null,
  source_id text,
  unlocked_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, reward_id)
);

create or replace function public.progression_level(total_xp bigint)
returns integer
language sql
immutable
set search_path = public
as $$
  select greatest(1, least(100, floor(sqrt(greatest(total_xp, 0)::numeric / 100))::integer));
$$;

create or replace function public.refresh_progress(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total bigint;
  current_level integer;
  previous_level integer;
  total_active_days integer;
begin
  select level into previous_level from public.user_progress where user_id = target_user_id;
  select coalesce(sum(xp_amount), 0)
  into total
  from public.xp_events
  where user_id = target_user_id and status = 'valid';

  current_level := public.progression_level(total);
  select count(distinct (occurred_at at time zone 'America/Sao_Paulo')::date)::integer
  into total_active_days
  from public.xp_events
  where user_id = target_user_id and status = 'valid';

  insert into public.user_progress (user_id, lifetime_xp, level, active_days, last_xp_at, updated_at)
  values (target_user_id, greatest(total, 0), current_level, total_active_days, now(), now())
  on conflict (user_id) do update
  set lifetime_xp = excluded.lifetime_xp,
      level = excluded.level,
      active_days = excluded.active_days,
      last_xp_at = excluded.last_xp_at,
      updated_at = now();

  insert into public.user_rewards (user_id, reward_id, source_type, source_id)
  select target_user_id, reward.id, 'level', current_level::text
  from public.rewards reward
  where reward.required_level is not null and reward.required_level <= current_level
  on conflict (user_id, reward_id) do nothing;

  if previous_level is not null and current_level > previous_level then
    insert into public.notifications (user_id, type, message, reference_type, reference_id)
    values (target_user_id, 'system', 'Você alcançou o nível ' || current_level || ' no Brickboard.', 'profile', target_user_id::text);
  end if;
end;
$$;

alter table public.notifications drop constraint if exists notifications_reference_type_check;
alter table public.notifications
add constraint notifications_reference_type_check
check (reference_type in ('post', 'comment', 'profile', 'achievement', 'ranking'));

create or replace function public.refresh_season_ranks(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ranked as (
    select
      progress.user_id,
      row_number() over (order by progress.eligible_xp desc, progress.active_days desc, profile.created_at) as new_rank,
      percent_rank() over (order by progress.eligible_xp desc, progress.active_days desc) * 100 as new_percentile
    from public.season_progress progress
    join public.profiles profile on profile.user_id = progress.user_id
    where progress.season_id = target_season_id
      and progress.is_qualified
      and not progress.is_disqualified
      and profile.show_in_leaderboard
      and not profile.is_official
  )
  update public.season_progress progress
  set rank = ranked.new_rank,
      percentile = ranked.new_percentile,
      division = case
        when ranked.new_percentile < 1 then 'furnace'
        when ranked.new_percentile < 5 then 'orange'
        when ranked.new_percentile < 20 then 'steel'
        when ranked.new_percentile < 45 then 'iron'
        when ranked.new_percentile < 75 then 'copper'
        else 'brick'
      end,
      updated_at = now()
  from ranked
  where progress.season_id = target_season_id
    and progress.user_id = ranked.user_id;
end;
$$;

create or replace function public.award_xp(
  target_user_id uuid,
  target_event_type text,
  target_source_type text,
  target_source_id text,
  target_actor_id uuid,
  target_event_key text,
  target_amount integer default null,
  target_metadata jsonb default '{}'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_rule public.xp_rules%rowtype;
  selected_profile public.profiles%rowtype;
  active_season_id uuid;
  resolved_amount integer;
  used_today integer;
  inserted_event_id uuid;
begin
  select * into selected_profile from public.profiles where user_id = target_user_id;
  if selected_profile.user_id is null or selected_profile.is_official then
    return false;
  end if;

  select * into selected_rule
  from public.xp_rules
  where event_type = target_event_type
    and enabled = true
    and effective_from <= now()
    and (effective_until is null or effective_until > now());

  if selected_rule.event_type is null then
    return false;
  end if;

  if target_actor_id = target_user_id and target_event_type in ('reaction_given', 'comment_liked') then
    return false;
  end if;

  if selected_rule.daily_limit is not null then
    select count(*) into used_today
    from public.xp_events
    where user_id = target_user_id
      and event_type = target_event_type
      and status in ('valid', 'held')
      and occurred_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
    if used_today >= selected_rule.daily_limit then
      return false;
    end if;
  end if;

  resolved_amount := coalesce(target_amount, selected_rule.actor_xp);
  if resolved_amount = 0 then
    return false;
  end if;

  select id into active_season_id
  from public.seasons
  where status in ('calibration', 'active')
    and starts_at <= now()
    and ends_at > now()
  order by starts_at desc
  limit 1;

  insert into public.xp_events (
    user_id, event_type, source_type, source_id, actor_id, xp_amount,
    season_id, event_key, metadata
  )
  values (
    target_user_id, target_event_type, target_source_type, target_source_id,
    target_actor_id, resolved_amount, active_season_id, target_event_key, target_metadata
  )
  on conflict (event_key) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return false;
  end if;

  perform public.refresh_progress(target_user_id);

  if active_season_id is not null then
    insert into public.season_progress (season_id, user_id, eligible_xp, active_days, is_qualified, updated_at)
    select
      active_season_id,
      target_user_id,
      coalesce(sum(event.xp_amount), 0),
      count(distinct (event.occurred_at at time zone 'America/Sao_Paulo')::date),
      coalesce(sum(event.xp_amount), 0) >= 100
        and count(distinct (event.occurred_at at time zone 'America/Sao_Paulo')::date) >= 3,
      now()
    from public.xp_events event
    where event.user_id = target_user_id
      and event.season_id = active_season_id
      and event.status = 'valid'
    on conflict (season_id, user_id) do update
    set eligible_xp = excluded.eligible_xp,
        active_days = excluded.active_days,
        is_qualified = excluded.is_qualified,
        updated_at = now();
    perform public.refresh_season_ranks(active_season_id);
  end if;

  perform public.refresh_basic_achievements(target_user_id);
  return true;
end;
$$;

create or replace function public.revoke_xp_for_source(
  target_source_type text,
  target_source_id text,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_user uuid;
begin
  for affected_user in
    select distinct user_id
    from public.xp_events
    where source_type = target_source_type
      and source_id = target_source_id
      and status in ('valid', 'held')
  loop
    update public.xp_events
    set status = 'revoked', revoked_at = now(), revocation_reason = reason
    where user_id = affected_user
      and source_type = target_source_type
      and source_id = target_source_id
      and status in ('valid', 'held');
    perform public.refresh_progress(affected_user);
  end loop;
end;
$$;

create or replace function public.handle_progression_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  rule public.xp_rules%rowtype;
begin
  if tg_op = 'DELETE' then
    perform public.revoke_xp_for_source(tg_table_name, old.id::text, 'Ação removida');
    return old;
  end if;

  if tg_table_name = 'community_posts' then
    if new.shared_post_id is null then
      if char_length(btrim(new.content)) >= 20 then
        perform public.award_xp(new.user_id, 'post_created', tg_table_name, new.id::text, new.user_id, 'post:create:' || new.id, null, '{}');
      end if;
    else
      if char_length(btrim(new.content)) >= 20 then
        perform public.award_xp(new.user_id, 'post_shared', tg_table_name, new.id::text, new.user_id, 'post:share:' || new.id, null, '{}');
      end if;
      select user_id into owner_id from public.community_posts where id = new.shared_post_id;
      select * into rule from public.xp_rules where event_type = 'post_shared';
      if owner_id is not null and owner_id <> new.user_id then
        perform public.award_xp(owner_id, 'post_shared', tg_table_name, new.id::text, new.user_id, 'post:share-received:' || new.id, rule.recipient_xp, '{}');
      end if;
    end if;
  elsif tg_table_name = 'community_comments' then
    if char_length(btrim(new.content)) >= 12 then
      perform public.award_xp(new.user_id, 'comment_created', tg_table_name, new.id::text, new.user_id, 'comment:create:' || new.id, null, '{}');
    end if;
    select user_id into owner_id from public.community_posts where id = new.post_id;
    select * into rule from public.xp_rules where event_type = 'comment_received';
    if owner_id is not null and owner_id <> new.user_id then
      perform public.award_xp(owner_id, 'comment_received', tg_table_name, new.id::text, new.user_id, 'comment:received:' || new.id, rule.recipient_xp, '{}');
    end if;
  elsif tg_table_name = 'community_reactions' then
    perform public.award_xp(new.user_id, 'reaction_given', tg_table_name, new.id::text, new.user_id, 'reaction:given:' || new.id, null, '{}');
    select user_id into owner_id from public.community_posts where id = new.post_id;
    select * into rule from public.xp_rules where event_type = 'reaction_received';
    if owner_id is not null and owner_id <> new.user_id then
      perform public.award_xp(owner_id, 'reaction_received', tg_table_name, new.id::text, new.user_id, 'reaction:received:' || new.post_id || ':' || new.user_id, rule.recipient_xp, '{}');
    end if;
  elsif tg_table_name = 'community_comment_likes' then
    select user_id into owner_id from public.community_comments where id = new.comment_id;
    select * into rule from public.xp_rules where event_type = 'comment_like_received';
    if owner_id is not null and owner_id <> new.user_id then
      perform public.award_xp(owner_id, 'comment_like_received', tg_table_name, new.id::text, new.user_id, 'comment:like-received:' || new.comment_id || ':' || new.user_id, rule.recipient_xp, '{}');
    end if;
  elsif tg_table_name = 'community_poll_votes' then
    perform public.award_xp(new.user_id, 'poll_voted', tg_table_name, new.id::text, new.user_id, 'poll:vote:' || new.poll_id || ':' || new.user_id, null, '{}');
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_progression on public.community_posts;
create trigger community_posts_progression after insert or delete on public.community_posts
for each row execute function public.handle_progression_event();

drop trigger if exists community_comments_progression on public.community_comments;
create trigger community_comments_progression after insert or delete on public.community_comments
for each row execute function public.handle_progression_event();

drop trigger if exists community_reactions_progression on public.community_reactions;
create trigger community_reactions_progression after insert or delete on public.community_reactions
for each row execute function public.handle_progression_event();

drop trigger if exists community_comment_likes_progression on public.community_comment_likes;
create trigger community_comment_likes_progression after insert or delete on public.community_comment_likes
for each row execute function public.handle_progression_event();

drop trigger if exists community_poll_votes_progression on public.community_poll_votes;
create trigger community_poll_votes_progression after insert on public.community_poll_votes
for each row execute function public.handle_progression_event();

insert into public.user_progress (user_id)
select profile.user_id
from public.profiles profile
where not profile.is_official
on conflict (user_id) do nothing;

insert into public.user_achievements (user_id, achievement_id, progress, target, unlocked_at)
select profile.user_id, achievement.id, 1, 1, now()
from public.profiles profile
cross join public.achievements achievement
where not profile.is_official
  and achievement.slug = 'fundador-brickboard'
  and profile.created_at < '2026-07-27 00:00:00-03'
on conflict (user_id, achievement_id) do nothing;

create or replace function public.refresh_basic_achievements(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  achievement_row public.achievements%rowtype;
  metric_value integer;
  metric_target integer;
  previous_unlock timestamptz;
begin
  for achievement_row in select * from public.achievements where is_active loop
    metric_target := (achievement_row.criteria ->> 'target')::integer;
    case achievement_row.criteria ->> 'metric'
      when 'posts' then select count(*) into metric_value from public.community_posts where user_id = target_user_id;
      when 'comments' then select count(*) into metric_value from public.community_comments where user_id = target_user_id;
      when 'active_days' then
        select count(distinct (occurred_at at time zone 'America/Sao_Paulo')::date)::integer
        into metric_value from public.xp_events where user_id = target_user_id and status = 'valid';
      when 'poll_votes' then select count(*) into metric_value from public.community_poll_votes where user_id = target_user_id;
      when 'shares' then select count(*) into metric_value from public.community_posts where user_id = target_user_id and shared_post_id is not null;
      when 'platforms' then select count(distinct platform_tag) into metric_value from public.community_posts where user_id = target_user_id and platform_tag is not null;
      when 'comment_likes_received' then
        select count(*) into metric_value
        from public.community_comment_likes likes
        join public.community_comments comment on comment.id = likes.comment_id
        where comment.user_id = target_user_id;
      when 'single_post_reactions' then
        select coalesce(max(total), 0)::integer into metric_value
        from (select count(*) total from public.community_reactions reaction join public.community_posts post on post.id = reaction.post_id where post.user_id = target_user_id group by reaction.post_id) counts;
      when 'single_post_comments' then
        select coalesce(max(total), 0)::integer into metric_value
        from (select count(*) total from public.community_comments comment join public.community_posts post on post.id = comment.post_id where post.user_id = target_user_id group by comment.post_id) counts;
      when 'account_days' then
        select greatest(0, extract(day from now() - created_at)::integer) into metric_value from public.profiles where user_id = target_user_id;
      else metric_value := 0;
    end case;

    if achievement_row.criteria ->> 'metric' <> 'founder' then
      select unlocked_at into previous_unlock
      from public.user_achievements
      where user_id = target_user_id and achievement_id = achievement_row.id;

      insert into public.user_achievements (user_id, achievement_id, progress, target, unlocked_at)
      values (
        target_user_id,
        achievement_row.id,
        least(metric_value, metric_target),
        metric_target,
        case when metric_value >= metric_target then now() else null end
      )
      on conflict (user_id, achievement_id) do update
      set progress = excluded.progress,
          target = excluded.target,
          unlocked_at = coalesce(public.user_achievements.unlocked_at, excluded.unlocked_at);

      if metric_value >= metric_target and previous_unlock is null then
        insert into public.notifications (user_id, type, message, reference_type, reference_id)
        values (target_user_id, 'system', 'Conquista desbloqueada: ' || achievement_row.name || '.', 'achievement', achievement_row.slug);
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.finalize_season(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  update public.seasons
  set status = 'calculating'
  where id = target_season_id and status in ('active', 'calibration');

  perform public.refresh_season_ranks(target_season_id);

  insert into public.notifications (user_id, type, message, reference_type, reference_id)
  select
    progress.user_id,
    'system',
    'A temporada terminou. Sua classificação final foi #' || progress.rank || '.',
    'ranking',
    target_season_id::text
  from public.season_progress progress
  join public.profiles profile on profile.user_id = progress.user_id
  where progress.season_id = target_season_id
    and progress.is_qualified
    and not progress.is_disqualified
    and not profile.is_official;

  update public.seasons set status = 'completed' where id = target_season_id;
end;
$$;

create or replace function public.public_profile(target_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_profile public.profiles%rowtype;
  result jsonb;
begin
  select * into selected_profile
  from public.profiles
  where lower(username) = lower(target_username)
     or lower(display_name) = lower(target_username)
     or lower(nickname) = lower(target_username)
  order by case when lower(username) = lower(target_username) then 0 else 1 end
  limit 1;
  if selected_profile.user_id is null then return null; end if;
  perform public.refresh_basic_achievements(selected_profile.user_id);

  select jsonb_build_object(
    'user_id', selected_profile.user_id,
    'username', selected_profile.username,
    'display_name', selected_profile.display_name,
    'avatar_url', selected_profile.avatar_url,
    'bio', selected_profile.bio,
    'is_official', selected_profile.is_official,
    'created_at', selected_profile.created_at,
    'favorite_platforms', selected_profile.favorite_platforms,
    'favorite_categories', selected_profile.favorite_categories,
    'equipped_title', selected_profile.equipped_title,
    'equipped_frame', selected_profile.equipped_frame,
    'profile_theme', selected_profile.profile_theme,
    'progress', case when selected_profile.is_official then null else jsonb_build_object(
      'lifetime_xp', case when selected_profile.show_lifetime_xp then coalesce(progress.lifetime_xp, 0) else null end,
      'level', coalesce(progress.level, 1),
      'next_level_xp', least(1000000, 100 * power(coalesce(progress.level, 1) + 1, 2)),
      'active_days', coalesce(progress.active_days, 0)
    ) end,
    'season', (
      select jsonb_build_object(
        'id', season.id, 'name', season.name, 'ends_at', season.ends_at,
        'eligible_xp', season_progress.eligible_xp, 'division', season_progress.division,
        'rank', season_progress.rank, 'percentile', season_progress.percentile,
        'is_qualified', season_progress.is_qualified
      )
      from public.seasons season
      left join public.season_progress season_progress
        on season_progress.season_id = season.id and season_progress.user_id = selected_profile.user_id
      where season.status in ('calibration', 'active')
      order by season.starts_at desc limit 1
    ),
    'stats', case when selected_profile.show_activity_stats then jsonb_build_object(
      'posts', (select count(*) from public.community_posts where user_id = selected_profile.user_id),
      'comments', (select count(*) from public.community_comments where user_id = selected_profile.user_id),
      'reactions_received', (select count(*) from public.community_reactions reaction join public.community_posts post on post.id = reaction.post_id where post.user_id = selected_profile.user_id),
      'replies_received', (select count(*) from public.community_comments comment join public.community_posts post on post.id = comment.post_id where post.user_id = selected_profile.user_id),
      'achievements', (select count(*) from public.user_achievements where user_id = selected_profile.user_id and unlocked_at is not null)
    ) else null end,
    'achievements', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', achievement.slug, 'name', achievement.name, 'description', achievement.description,
        'category', achievement.category, 'rarity', achievement.rarity,
        'progress', user_achievement.progress, 'target', user_achievement.target,
        'unlocked_at', user_achievement.unlocked_at, 'is_equipped', user_achievement.is_equipped
      ) order by user_achievement.is_equipped desc, achievement.sort_order), '[]'::jsonb)
      from public.user_achievements user_achievement
      join public.achievements achievement on achievement.id = user_achievement.achievement_id
      where user_achievement.user_id = selected_profile.user_id
        and (user_achievement.unlocked_at is not null or not achievement.is_hidden)
    )
  )
  into result
  from public.user_progress progress
  where progress.user_id = selected_profile.user_id;

  if result is null then
    select jsonb_build_object(
      'user_id', selected_profile.user_id,
      'username', selected_profile.username,
      'display_name', selected_profile.display_name,
      'avatar_url', selected_profile.avatar_url,
      'bio', selected_profile.bio,
      'is_official', selected_profile.is_official,
      'created_at', selected_profile.created_at,
      'favorite_platforms', selected_profile.favorite_platforms,
      'favorite_categories', selected_profile.favorite_categories,
      'progress', null,
      'season', null,
      'stats', null,
      'achievements', '[]'::jsonb
    ) into result;
  end if;

  return result;
end;
$$;

create or replace function public.current_user_progress()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
  result jsonb;
begin
  if current_id is null then raise exception 'Autenticação necessária'; end if;
  perform public.refresh_progress(current_id);
  perform public.refresh_basic_achievements(current_id);

  select jsonb_build_object(
    'progress', to_jsonb(progress),
    'daily', jsonb_build_object(
      'post_created', greatest(0, 3 - (select count(*) from public.xp_events where user_id = current_id and event_type = 'post_created' and status = 'valid' and occurred_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')),
      'comment_created', greatest(0, 10 - (select count(*) from public.xp_events where user_id = current_id and event_type = 'comment_created' and status = 'valid' and occurred_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')),
      'reaction_given', greatest(0, 15 - (select count(*) from public.xp_events where user_id = current_id and event_type = 'reaction_given' and status = 'valid' and occurred_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'))
    ),
    'events', (select coalesce(jsonb_agg(to_jsonb(event) order by event.occurred_at desc), '[]'::jsonb) from (select event_type, xp_amount, status, occurred_at, revocation_reason from public.xp_events where user_id = current_id order by occurred_at desc limit 30) event),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('slug', reward.slug, 'name', reward.name, 'type', reward.type)), '[]'::jsonb) from public.user_rewards user_reward join public.rewards reward on reward.id = user_reward.reward_id where user_reward.user_id = current_id)
  )
  into result
  from public.user_progress progress
  where progress.user_id = current_id;

  return result;
end;
$$;

create or replace function public.season_leaderboard(target_season_slug text default null, target_limit integer default 100)
returns table (
  rank bigint,
  username text,
  display_name text,
  avatar_url text,
  level integer,
  eligible_xp bigint,
  active_days integer,
  division text
)
language sql
stable
security definer
set search_path = public
as $$
  with selected_season as (
    select id
    from public.seasons
    where (target_season_slug is not null and slug = target_season_slug)
       or (target_season_slug is null and status in ('calibration', 'active'))
    order by case when target_season_slug is null then starts_at end desc
    limit 1
  ),
  ranked as (
    select
      row_number() over (order by progress.eligible_xp desc, progress.active_days desc, profile.created_at) as position,
      profile.username,
      profile.display_name,
      profile.avatar_url,
      coalesce(user_progress.level, 1) as user_level,
      progress.eligible_xp,
      progress.active_days,
      progress.division
    from public.season_progress progress
    join selected_season season on season.id = progress.season_id
    join public.profiles profile on profile.user_id = progress.user_id
    left join public.user_progress user_progress on user_progress.user_id = progress.user_id
    where progress.is_qualified
      and not progress.is_disqualified
      and profile.show_in_leaderboard
      and not profile.is_official
  )
  select position, username, display_name, avatar_url, user_level, eligible_xp, active_days, division
  from ranked
  order by position
  limit least(greatest(target_limit, 1), 100);
$$;

create or replace function public.set_achievement_showcase(target_slugs text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
begin
  if current_id is null then raise exception 'Autenticação necessária'; end if;
  if coalesce(array_length(target_slugs, 1), 0) > 3 then raise exception 'Escolha no máximo três conquistas'; end if;

  update public.user_achievements set is_equipped = false, equipped_order = null where user_id = current_id;
  update public.user_achievements user_achievement
  set is_equipped = true,
      equipped_order = selected.position
  from (
    select achievement.id, slugs.position
    from unnest(target_slugs) with ordinality slugs(slug, position)
    join public.achievements achievement on achievement.slug = slugs.slug
  ) selected
  where user_achievement.user_id = current_id
    and user_achievement.achievement_id = selected.id
    and user_achievement.unlocked_at is not null;
end;
$$;

alter table public.user_progress enable row level security;
alter table public.xp_events enable row level security;
alter table public.xp_rules enable row level security;
alter table public.seasons enable row level security;
alter table public.season_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.rewards enable row level security;
alter table public.user_rewards enable row level security;

create policy seasons_public_read on public.seasons for select to anon, authenticated using (true);
create policy achievements_public_read on public.achievements for select to anon, authenticated using (is_active);
create policy rewards_public_read on public.rewards for select to anon, authenticated using (true);
create policy own_progress_read on public.user_progress for select to authenticated using (auth.uid() = user_id);
create policy own_xp_events_read on public.xp_events for select to authenticated using (auth.uid() = user_id);
create policy own_achievements_read on public.user_achievements for select to authenticated using (auth.uid() = user_id);
create policy own_rewards_read on public.user_rewards for select to authenticated using (auth.uid() = user_id);

grant select on public.seasons, public.achievements, public.rewards to anon, authenticated;
grant select on public.user_progress, public.xp_events, public.user_achievements, public.user_rewards to authenticated;
grant execute on function public.public_profile(text) to anon, authenticated;
grant execute on function public.current_user_progress() to authenticated;
grant execute on function public.season_leaderboard(text, integer) to anon, authenticated;
grant execute on function public.set_achievement_showcase(text[]) to authenticated;

revoke insert, update, delete on public.user_progress, public.xp_events, public.season_progress, public.user_achievements, public.user_rewards from anon, authenticated;
revoke execute on function public.award_xp(uuid, text, text, text, uuid, text, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.refresh_progress(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_basic_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.revoke_xp_for_source(text, text, text) from public, anon, authenticated;
revoke execute on function public.refresh_season_ranks(uuid) from public, anon, authenticated;
revoke execute on function public.finalize_season(uuid) from public, anon, authenticated;
