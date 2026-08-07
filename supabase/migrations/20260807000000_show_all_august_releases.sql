update public.release_radar_items
set
  is_active = true,
  updated_at = now()
where id in (
  'the-sinking-city-2',
  'metal-gear-solid-master-collection-vol-2',
  'star-wars-zero-company',
  'elden-ring-tarnished-edition'
);
