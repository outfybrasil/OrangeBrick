with radar as (
  select
    lower(btrim(game)) as game_key,
    game,
    image_url,
    release_date,
    platforms,
    is_active,
    id
  from public.release_radar_items
  where nullif(btrim(game), '') is not null
), catalog as (
  select
    game_key,
    (array_agg(game order by is_active desc, id))[1] as name,
    (array_agg(image_url order by is_active desc, id))[1] as cover_image_url,
    case when count(distinct release_date) = 1 then min(release_date) end as release_date
  from radar
  group by game_key
), catalog_platforms as (
  select
    radar.game_key,
    coalesce(array_agg(distinct platform.value) filter (where platform.value is not null), '{}') as platforms
  from radar
  left join lateral unnest(radar.platforms) as platform(value) on true
  group by radar.game_key
)
insert into public.games (slug, name, cover_image_url, release_date, platforms)
select
  coalesce(nullif(btrim(regexp_replace(catalog.game_key, '[^a-z0-9]+', '-', 'g'), '-'), ''), 'game')
    || '-' || md5(catalog.game_key),
  catalog.name,
  catalog.cover_image_url,
  catalog.release_date,
  catalog_platforms.platforms
from catalog
join catalog_platforms using (game_key)
on conflict (slug) do nothing;

update public.release_radar_items as radar
set game_id = games.id
from public.games as games
where radar.game_id is null
  and lower(btrim(radar.game)) = lower(btrim(games.name))
  and games.slug = coalesce(
    nullif(btrim(regexp_replace(lower(btrim(radar.game)), '[^a-z0-9]+', '-', 'g'), '-'), ''),
    'game'
  ) || '-' || md5(lower(btrim(radar.game)));

insert into public.game_posts (game_id, post_id)
select distinct radar.game_id, posts.id
from public.release_radar_items as radar
join public.posts as posts on posts.slug = radar.post_slug
where radar.game_id is not null
  and radar.post_slug is not null
on conflict (game_id, post_id) do nothing;
