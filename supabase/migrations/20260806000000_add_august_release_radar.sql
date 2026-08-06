insert into public.release_radar_items
  (id, game, release_label, schedule_label, platforms, image_url, badge, category, post_slug, sort_order, is_active, release_date)
values
  ('beast-of-reincarnation', 'Beast of Reincarnation', '4 de Agosto', 'Terça-feira', array['PC','PS5','XSX'], 'https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/releases/beast-of-reincarnation/radar-2026.webp', 'RPG de ação', 'week', null, 8040, true, date '2026-08-04'),
  ('marvel-tokon-fighting-souls', 'MARVEL T' || chr(333) || 'kon: Fighting Souls', '6 de Agosto', 'Quinta-feira', array['PC','PS5'], 'https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/releases/marvel-tokon-fighting-souls/radar-2026.webp', 'Luta', 'week', null, 8060, true, date '2026-08-06'),
  ('resonance-a-plague-tale-legacy', 'Resonance: A Plague Tale Legacy', '27 de Agosto', 'Quinta-feira', array['PC','PS5','XSX'], 'https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/releases/resonance-a-plague-tale-legacy/radar-2026.webp', 'Ação e aventura', 'week', null, 8270, true, date '2026-08-27')
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
