insert into public.release_radar_items
  (id, game, release_label, schedule_label, platforms, image_url, badge, category, post_slug, sort_order, is_active, release_date)
values
  (
    'splatoon-raiders',
    'Splatoon Raiders',
    '23 de Julho',
    'Quinta-feira',
    array['SWITCH 2'],
    'https://assets.nintendo.com.au/image/upload/f_auto,q_auto/NAL/Migration/SplatoonRaiders/SplatoonRaiders_research_scr_01.jpg',
    'Ação',
    'week',
    null,
    30,
    true,
    date '2026-07-23'
  ),
  (
    'an-eggstremely-hard-game',
    'An Eggstremely Hard Game',
    '24 de Julho',
    'Sexta-feira',
    array['PC'],
    'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4112070/257348644/1527357469f8860a06a64e9d447b7a958d33b1f7/movie_full.jpg',
    'Indie',
    'week',
    null,
    35,
    true,
    date '2026-07-24'
  ),
  (
    'everquest-legends',
    'EverQuest Legends',
    '28 de Julho',
    'Terça-feira',
    array['PC'],
    'https://www.gematsu.com/wp-content/uploads/2026/06/EverQuest-Legends_2026_06-16-26_006.jpg',
    'MMORPG',
    'week',
    null,
    50,
    true,
    date '2026-07-28'
  )
on conflict (id) do update
set
  game = excluded.game,
  release_label = excluded.release_label,
  schedule_label = excluded.schedule_label,
  platforms = excluded.platforms,
  image_url = excluded.image_url,
  badge = excluded.badge,
  category = excluded.category,
  post_slug = excluded.post_slug,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  release_date = excluded.release_date,
  updated_at = now();
