-- Radar de Lançamentos: preenche as lacunas de novembro/dezembro/2027
-- e reforça setembro/outubro. Janelas sem data exata entram como 'upcoming'.

insert into public.release_radar_items (
  id, game, release_label, release_date, schedule_label, platforms,
  image_url, badge, product_type, is_indie, category, post_slug, sort_order, is_active
) values
  (gen_random_uuid(), 'Culdcept Begins', '17 de Setembro', '2026-09-17', 'Quinta-feira',
   array['SWITCH 2'], null, 'RPG de tabuleiro', 'game', false, 'upcoming', null, 20260935, true),
  (gen_random_uuid(), 'End of Abyss', '1 de Outubro', '2026-10-01', 'Quinta-feira',
   array['PC','PS5','XBOX SERIES'], null, 'Ação e aventura', 'game', false, 'upcoming', null, 20261015, true),
  (gen_random_uuid(), 'Ratatan', '15 de Outubro', '2026-10-15', 'Quinta-feira',
   array['PC','SWITCH','SWITCH 2'], null, 'Ritmo', 'game', true, 'upcoming', null, 20261025, true),
  (gen_random_uuid(), 'Godzilla: Destroy All Monsters Melee Remastered', '3 de Novembro', '2026-11-03', 'Terça-feira',
   array['PC','PS5','XBOX SERIES','SWITCH 2'], null, 'Luta', 'game', false, 'upcoming', null, 20261110, true),
  (gen_random_uuid(), 'Warhammer 40,000: Dawn of War IV', '30 de Novembro', '2026-11-30', 'Segunda-feira',
   array['PC'], null, 'Estratégia', 'game', false, 'upcoming', null, 20261190, true),
  (gen_random_uuid(), 'The Duskbloods', 'Dezembro de 2026', null, 'Janela prevista',
   array['SWITCH 2'], null, 'Ação', 'game', false, 'upcoming', null, 20261295, true),
  (gen_random_uuid(), 'Professor Layton and the New World of Steam', 'Dezembro de 2026', null, 'Janela prevista',
   array['SWITCH','PS5','PC'], null, 'Puzzle', 'game', false, 'upcoming', null, 20261285, true),
  (gen_random_uuid(), 'Turok: Origins', 'Q4 2026', null, 'Janela prevista',
   array['PS5','XBOX SERIES','SWITCH','PC'], null, 'Ação', 'game', false, 'upcoming', null, 20261275, true),
  (gen_random_uuid(), 'The Wolf Among Us Remastered', 'Q4 2026', null, 'Janela prevista',
   array['PS5','XBOX SERIES','PC'], null, 'Remaster', 'game', false, 'upcoming', null, 20261270, true),
  (gen_random_uuid(), 'Bloodstained: The Scarlet Engagement', '2026', null, 'Janela prevista',
   array['PS5','XBOX SERIES','PC'], null, 'Ação e aventura', 'game', false, 'upcoming', null, 20261265, true),
  (gen_random_uuid(), 'Witchbrook', '2026', null, 'Janela prevista',
   array['XBOX SERIES','SWITCH','PC'], null, 'Simulador social', 'game', true, 'upcoming', null, 20261260, true),
  (gen_random_uuid(), 'Metro 2039', '1 de Fevereiro', '2027-02-01', 'Segunda-feira',
   array['PC','PS5','XBOX SERIES'], null, 'FPS', 'game', false, 'upcoming', null, 20270205, true)
on conflict do nothing;
