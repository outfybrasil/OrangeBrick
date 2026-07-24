create table if not exists public.release_radar_items (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  game text not null check (char_length(game) between 1 and 160),
  release_label text not null check (char_length(release_label) between 1 and 80),
  schedule_label text not null check (char_length(schedule_label) between 1 and 80),
  platforms text[] not null default '{}',
  image_url text not null check (image_url ~ '^https://'),
  badge text not null check (char_length(badge) between 1 and 60),
  category text not null check (category in ('week', 'upcoming')),
  post_slug text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists release_radar_items_active_order_idx
  on public.release_radar_items (is_active, category, sort_order);

alter table public.release_radar_items enable row level security;

drop policy if exists release_radar_public_read on public.release_radar_items;
create policy release_radar_public_read on public.release_radar_items
  for select to anon, authenticated
  using (is_active = true or coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists release_radar_admin_insert on public.release_radar_items;
create policy release_radar_admin_insert on public.release_radar_items
  for insert to authenticated
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists release_radar_admin_update on public.release_radar_items;
create policy release_radar_admin_update on public.release_radar_items
  for update to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists release_radar_admin_delete on public.release_radar_items;
create policy release_radar_admin_delete on public.release_radar_items
  for delete to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

grant select on public.release_radar_items to anon;
grant select, insert, update, delete on public.release_radar_items to authenticated;

insert into public.release_radar_items
  (id, game, release_label, schedule_label, platforms, image_url, badge, category, post_slug, sort_order)
values
  ('avatar-legends-fighting-game', 'Avatar Legends: The Fighting Game', '23 de Julho', 'Quinta-feira', array['PC','PS5'], 'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_1240/b_white/f_auto/q_auto/store/software/switch/70010000124322/9ececef2d8606f8aef67554fb23afc72dd5a505dd341eb1bc4d54011769e39be', 'Luta', 'week', null, 10),
  ('disgaea-mayhem', 'Disgaea Mayhem', '23 de Julho', 'Quinta-feira', array['PC','PS5','SWITCH','SWITCH 2'], 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4402250/e2115dc652a22e4743e8e140660ce2668296ae87/capsule_616x353.jpg?t=1784822406', 'RPG de ação', 'week', null, 20),
  ('splatoon-raiders', 'Splatoon Raiders', '23 de Julho', 'Quinta-feira', array['SWITCH 2'], 'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_1240/b_white/f_auto/q_auto/store/software/switch2/70010000122824/cf587e01f6f115398f411f280dba21e025795eb69f234a41722341ea999d170d', 'Ação', 'week', null, 30),
  ('halo-campaign-evolved', 'Halo: Campaign Evolved', '28 de Julho', 'Terça-feira', array['PC','PS5','XSX'], 'https://rollingstone.com.br/wp-content/uploads/2025/10/halo-halo-studios-rolling-stone.jpg', 'FPS', 'week', 'halo-campaign-evolved-faltam-5-dias-o-que-esperar-do-remake', 40),
  ('everquest-legends', 'EverQuest Legends', '28 de Julho', 'Terça-feira', array['PC'], 'https://assets-cdn.daybreakgames.com/uploads/dcsclient/000/000/334/561.jpg?v=1.0', 'MMORPG', 'week', null, 50),
  ('mistfall-hunter', 'Mistfall Hunter', '29 de Julho', 'Quarta-feira', array['PC','PS5','XSX'], 'https://lf16-fe-tos.bytedgame.com/obj/g-marketing-assets-sg/2025_09_02_03_42_26/196038060061_s1652719.png', 'RPG de ação', 'week', null, 60),
  ('kusan-city-of-wolves', 'Kusan: City of Wolves', '30 de Julho', 'Quinta-feira', array['PC','PS5','XSX','SWITCH'], 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRX1m-vaAwKstZZDLablUUPg8gNBkfM8cc32bY9h958xA&s=10', 'Tiro', 'week', null, 70),
  ('leafy-corner', 'Leafy Corner', '30 de Julho', 'Quinta-feira', array['PC','PS5','XSX','XBOX ONE'], 'https://sm.ign.com/ign_fr/cover/l/leafy-corn/leafy-corner_52f7.jpg', 'Simulação', 'week', null, 80),
  ('culdcept-first-saturn-tribute', 'Culdcept The First Saturn Tribute', '30 de Julho', 'Quinta-feira', array['PC'], 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3825600/e1e372913c0886fa1be8a1b759e762e6aff9d47b/capsule_616x353.jpg?t=1783911973', 'Estratégia', 'week', null, 90),
  ('truxton-extreme', 'Truxton Extreme', '30 de Julho', 'Quinta-feira', array['PC','PS5','XSX','SWITCH 2'], 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4esGcRH_Jto-AAYzna6sklmNshGa3WvLXOoQilHHiLsk3l4dklt-UeIc&s=10', 'Shoot ''em up', 'week', null, 100),
  ('the-relic-first-guardian', 'The Relic: First Guardian', '31 de Julho', 'Sexta-feira', array['PC','PS5'], 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBlWYgmnst8CVRT7TsgL_CHwfWYXaSDcqiLZaOPsm5qklWlZkq5U2sb3g&s=10', 'RPG de ação', 'week', null, 110),
  ('corsair-cove', 'Corsair Cove', '31 de Julho', 'Sexta-feira', array['PC'], 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1368140/8ad275589211455dbd44cb992f18e7b677ae77f5/capsule_616x353.jpg?t=1784542549', 'Estratégia', 'week', null, 120),
  ('wolverine', 'Marvel''s Wolverine', '15 de Setembro', 'Terça-feira', array['PS5'], 'https://gameverse.com.ua/uploads/games/marvel-s-wolverine/qda4.jpg', 'Lançamento', 'upcoming', null, 130),
  ('starfield-dlc', 'Starfield: Shattered Space', '30 de Setembro', 'Segunda-feira', array['XSX','PC'], 'https://th.bing.com/th/id/OSK.Nmyh32B7CgPBu89L_IZEV_yG7iCt8cGtAAX2v2Fo7dA?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3', 'DLC / Expansão', 'upcoming', null, 140),
  ('gears-eday', 'Gears of War: E-Day', '06 de Outubro', 'Terça-feira', array['XSX','PC'], 'https://www.notebookcheck.info/fileadmin/Notebooks/News/_nc5/Gears-of-War-E-Day-Gamescom.jpg', 'Lançamento', 'upcoming', null, 150),
  ('cod-mw4', 'Call of Duty: Modern Warfare 4', '23 de Outubro', 'Sexta-feira', array['PS5','XSX','PC','SWITCH 2'], 'https://cdn.box.co.uk/magefan_blog/modern-warfare-4-main.jpg', 'Lançamento', 'upcoming', 'call-of-duty-modern-warfare-4-beta-nintendo-switch-2-data-outubro', 160),
  ('gta-6', 'Grand Theft Auto VI', '19 de Novembro', 'Quinta-feira', array['PS5','XSX'], 'https://th.bing.com/th/id/OIP.CzMibmTT8C1XveJ-BJTOAQHaEK?w=328&h=184&c=7&r=0&o=7&dpr=1.1&pid=1.7&rm=3', 'Lançamento', 'upcoming', null, 170),
  ('witcher-expansion', 'The Witcher 3: Songs of the Past', '2027', 'CD Projekt Red', array['PS5','XSX','PC'], 'https://www.cdprojekt.com/en/wp-content/uploads-en/2026/05/the-witcher-3-sop-16x9-master-image-en-1-1024x576.png', 'DLC / Expansão', 'upcoming', 'the-witcher-3-expansao-songs-of-the-past-anuncio-gamescom-2026', 180),
  ('wreckreation2', 'Wreckreation 2', 'Sem data definida', 'Em Breve', array['PS5','XSX','PC'], 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCP_EHJWV8cL1TlEcIWRiOjHaD2iwXfUjz5XPcHBk_Gg&s=10', 'Lançamento', 'upcoming', 'wreckreation-2-anunciado-criadores-burnout-ps5-xbox-pc', 190)
on conflict (id) do nothing;
