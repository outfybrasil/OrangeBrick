alter table public.release_radar_items
  add column if not exists release_date date;

update public.release_radar_items
set release_date = case id
  when 'avatar-legends-fighting-game' then date '2026-07-23'
  when 'disgaea-mayhem' then date '2026-07-23'
  when 'splatoon-raiders' then date '2026-07-23'
  when 'halo-campaign-evolved' then date '2026-07-28'
  when 'everquest-legends' then date '2026-07-28'
  when 'mistfall-hunter' then date '2026-07-29'
  when 'kusan-city-of-wolves' then date '2026-07-30'
  when 'leafy-corner' then date '2026-07-30'
  when 'culdcept-first-saturn-tribute' then date '2026-07-30'
  when 'truxton-extreme' then date '2026-07-30'
  when 'the-relic-first-guardian' then date '2026-07-31'
  when 'corsair-cove' then date '2026-07-31'
  when 'wolverine' then date '2026-09-15'
  when 'starfield-dlc' then date '2026-09-30'
  when 'gears-eday' then date '2026-10-06'
  when 'cod-mw4' then date '2026-10-23'
  when 'gta-6' then date '2026-11-19'
  else release_date
end;

create index if not exists release_radar_items_release_date_idx
  on public.release_radar_items (release_date, sort_order);
