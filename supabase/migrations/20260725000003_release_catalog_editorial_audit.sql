alter table public.release_radar_items
  add column if not exists product_type text not null default 'game'
    check (product_type in ('game', 'dlc')),
  add column if not exists is_indie boolean not null default false;

with audit(id, product_type, is_indie, badge) as (
  values
    ('heartopia', 'game', false, 'Lançamento'),
    ('blasten', 'game', true, 'Indie'),
    ('cozy-caravan', 'game', true, 'Indie'),
    ('pathologic-3', 'game', true, 'Indie'),
    ('spear', 'game', true, 'Indie'),
    ('quarantine-zone-the-last-check', 'game', true, 'Indie'),
    ('streetdog-bmx', 'game', true, 'Indie'),
    ('cassette-boy', 'game', true, 'Indie'),
    ('trails-beyond-the-horizon', 'game', false, 'Lançamento'),
    ('brokenlore-unfollow', 'game', false, 'Lançamento'),
    ('ghetto-zombies-graffiti-squad', 'game', true, 'Indie'),
    ('carnedge', 'game', false, 'Lançamento'),
    ('duet-night-abyss', 'game', false, 'Lançamento'),
    ('mio-memories-in-orbit', 'game', true, 'Indie'),
    ('eldegarde', 'game', false, 'Lançamento'),
    ('gooey', 'game', true, 'Indie'),
    ('tr-49', 'game', false, 'Lançamento'),
    ('arknights-endfield', 'game', false, 'Lançamento'),
    ('hermit-and-pig', 'game', false, 'Lançamento'),
    ('banquet-for-fools', 'game', false, 'Lançamento'),
    ('escape-the-ever-after', 'game', true, 'Indie'),
    ('the-fortress', 'game', true, 'Indie'),
    ('highguard', 'game', false, 'Lançamento'),
    ('conquest-tactics', 'game', true, 'Indie'),
    ('earth-must-die', 'game', false, 'Lançamento'),
    ('rightfully-beary-arms', 'game', true, 'Indie'),
    ('underground-garage', 'game', false, 'Lançamento'),
    ('lanesplit', 'game', true, 'Indie'),
    ('seven-deadly-sins-origin', 'game', false, 'Lançamento'),
    ('cairn', 'game', true, 'Indie'),
    ('dark-auction', 'game', false, 'Lançamento'),
    ('i-hate-this-place', 'game', true, 'Indie'),
    ('space-warlord-baby-trading-simulator', 'game', false, 'Lançamento'),
    ('ufophilia', 'game', true, 'Indie'),
    ('code-vein-2', 'game', false, 'Lançamento'),
    ('folklore-hunter', 'game', true, 'Indie'),
    ('my-tiny-garden', 'game', true, 'Indie'),
    ('occupy-mars-the-game', 'game', true, 'Indie'),
    ('the-18th-attic', 'game', true, 'Indie'),
    ('crimson-capes', 'game', false, 'Lançamento'),
    ('dragon-quest-vii-reimagined', 'game', false, 'Lançamento'),
    ('unemployment-simulator-2018', 'game', true, 'Indie'),
    ('dead-pets', 'game', true, 'Indie'),
    ('ghost-gunners', 'game', true, 'Indie'),
    ('humanityz', 'game', true, 'Indie'),
    ('my-hero-academia-alls-justice', 'game', false, 'Lançamento'),
    ('nioh-3', 'game', false, 'Lançamento'),
    ('mewgenics', 'game', true, 'Indie'),
    ('relooted', 'game', false, 'Lançamento'),
    ('the-prisoning-fletchers-quest', 'game', true, 'Indie'),
    ('romeo-is-a-dead-man', 'game', false, 'Lançamento'),
    ('blazblue-entropy-effect-x', 'game', false, 'Lançamento'),
    ('disciples-domination', 'game', false, 'Lançamento'),
    ('mario-tennis-fever', 'game', false, 'Lançamento'),
    ('ride-6', 'game', false, 'Lançamento'),
    ('clue-murder-by-death', 'game', true, 'Indie'),
    ('high-on-life-2', 'game', false, 'Lançamento'),
    ('reanimal', 'game', false, 'Lançamento'),
    ('dobbel-dungeon', 'game', true, 'Indie'),
    ('menherarium', 'game', true, 'Indie'),
    ('strange-brew', 'game', true, 'Indie'),
    ('the-killing-stone', 'game', true, 'Indie'),
    ('demon-tides', 'game', false, 'Lançamento'),
    ('love-eternal', 'game', true, 'Indie'),
    ('styx-blades-of-greed', 'game', false, 'Lançamento'),
    ('ys-x-proud-nordics', 'game', false, 'Lançamento'),
    ('rainbow-six-mobile', 'game', false, 'Lançamento'),
    ('tides-of-tomorrow', 'game', false, 'Lançamento'),
    ('reigns-the-witcher', 'game', false, 'Lançamento'),
    ('tales-of-berseria-remastered', 'game', false, 'Lançamento'),
    ('resident-evil-requiem', 'game', false, 'Lançamento'),
    ('gnaughty-gnomes', 'game', false, 'Lançamento'),
    ('scott-pilgrim-ex', 'game', false, 'Lançamento'),
    ('homura-hime', 'game', false, 'Lançamento'),
    ('marathon', 'game', false, 'Lançamento'),
    ('never-grace', 'game', true, 'Indie'),
    ('lost-and-found-co', 'game', false, 'Lançamento'),
    ('1348-ex-voto', 'game', false, 'Lançamento'),
    ('fatal-frame-ii-remake', 'game', false, 'Lançamento'),
    ('monster-hunter-stories-3', 'game', false, 'Lançamento'),
    ('mlb-the-show-26', 'game', false, 'Lançamento'),
    ('xploit-zero', 'game', true, 'Indie'),
    ('crimson-desert', 'game', false, 'Lançamento'),
    ('dynasty-warriors-3-remastered', 'game', false, 'Lançamento'),
    ('mouse-pi-for-hire', 'game', false, 'Lançamento'),
    ('ghost-master-resurrection', 'game', false, 'Lançamento'),
    ('rubato', 'game', false, 'Lançamento'),
    ('ariana-and-the-elder-codex', 'game', false, 'Lançamento'),
    ('copa-city', 'game', false, 'Lançamento'),
    ('life-is-strange-reunion', 'game', false, 'Lançamento'),
    ('screamer', 'game', false, 'Lançamento'),
    ('pokemon-champions', 'game', false, 'Lançamento'),
    ('before-i-go', 'game', false, 'Lançamento'),
    ('shantytown', 'game', false, 'Lançamento'),
    ('tomodachi-life-living-the-dream', 'game', false, 'Lançamento'),
    ('pragmata', 'game', false, 'Lançamento'),
    ('aphelion', 'game', false, 'Lançamento'),
    ('diablo-iv-lord-of-hatred', 'game', false, 'Lançamento'),
    ('invincible-vs', 'game', false, 'Lançamento'),
    ('saros', 'game', false, 'Lançamento'),
    ('dead-as-disco', 'game', false, 'Lançamento'),
    ('mixtape', 'game', false, 'Lançamento'),
    ('outbound', 'game', false, 'Lançamento'),
    ('battlestar-galactica-scattered-hopes', 'game', false, 'Lançamento'),
    ('call-of-the-elder-gods', 'game', false, 'Lançamento'),
    ('directive-8020', 'game', false, 'Lançamento'),
    ('subnautica-2', 'game', false, 'Lançamento'),
    ('corsairs-battle-of-the-caribbean', 'game', false, 'Lançamento'),
    ('farming-simulator-26-switch-edition', 'game', false, 'Lançamento'),
    ('forza-horizon-6', 'game', false, 'Lançamento'),
    ('thick-as-thieves', 'game', false, 'Lançamento'),
    ('yoshi-and-the-mysterious-book', 'game', false, 'Lançamento'),
    ('bubsy-4d', 'game', false, 'Lançamento'),
    ('enter-the-chronosphere', 'game', false, 'Lançamento'),
    ('paralives', 'game', false, 'Lançamento'),
    ('realm-of-ink', 'game', false, 'Lançamento'),
    ('lumentale-memories-of-trey', 'game', false, 'Lançamento'),
    ('yerba-buena', 'game', false, 'Lançamento'),
    ('stonemachia', 'game', false, 'Lançamento'),
    ('007-first-light', 'game', false, 'Lançamento'),
    ('echo-generation-2', 'game', false, 'Lançamento'),
    ('schrodingers-call', 'game', false, 'Lançamento'),
    ('crashout-crew', 'game', false, 'Lançamento'),
    ('moonsigil-atlas', 'game', false, 'Lançamento'),
    ('pictonico', 'game', true, 'Indie'),
    ('lego-batman-legacy-of-the-dark-knight', 'game', false, 'Lançamento'),
    ('efootball-kick-off', 'game', false, 'Lançamento'),
    ('killer-bean', 'game', false, 'Lançamento'),
    ('nba-the-run', 'game', false, 'Lançamento'),
    ('rf-online-next', 'game', false, 'Lançamento'),
    ('barbie-horse-ride-and-rescue', 'game', false, 'Lançamento'),
    ('adventures-of-elliot', 'game', false, 'Lançamento'),
    ('dark-scrolls', 'game', false, 'Lançamento'),
    ('star-fox', 'game', false, 'Lançamento'),
    ('phantom-blade-zero', 'game', false, 'Lançamento'),
    ('bus-simulator-27', 'game', false, 'Lançamento'),
    ('grand-theft-auto-vi', 'game', false, 'Lançamento'),
    ('ganbare-goemon-daishuugou', 'game', false, 'Lançamento'),
    ('rhythm-heaven-groove', 'game', false, 'Lançamento'),
    ('ao-oni', 'game', true, 'Indie'),
    ('undergrounded', 'game', false, 'Lançamento'),
    ('doom-dark-ages-revelations', 'game', false, 'Lançamento'),
    ('moonlight-peaks', 'game', false, 'Lançamento'),
    ('assassins-creed-black-flag-resynced', 'game', false, 'Lançamento'),
    ('backyard-baseball', 'game', false, 'Lançamento'),
    ('ea-sports-college-football-27', 'game', false, 'Lançamento'),
    ('granblue-fantasy-relink-endless-ragnarok', 'game', false, 'Lançamento'),
    ('gunvolt-chronicles-dual-collection', 'game', false, 'Lançamento'),
    ('tokyo-valkyries', 'game', false, 'Lançamento'),
    ('digimon-story-time-stranger', 'game', false, 'Lançamento'),
    ('echoes-of-aincrad', 'game', false, 'Lançamento'),
    ('palworld', 'game', false, 'Lançamento'),
    ('wuthering-waves', 'game', false, 'Lançamento'),
    ('the-alters-last-variable', 'game', false, 'Lançamento'),
    ('hell-clock', 'game', false, 'Lançamento'),
    ('cozy-grove-camp-spirit', 'game', false, 'Lançamento'),
    ('teeto', 'game', false, 'Lançamento'),
    ('culdcept-begins', 'game', false, 'Lançamento'),
    ('hell-maiden', 'game', false, 'Lançamento'),
    ('ebaseball-pro-spirit-2026', 'game', false, 'Lançamento'),
    ('the-guild-europe-1410', 'game', false, 'Lançamento'),
    ('heave-ho-2', 'game', false, 'Lançamento'),
    ('moss-the-forgotten-relic', 'game', false, 'Lançamento'),
    ('dive-or-die-children-of-rain', 'game', false, 'Lançamento'),
    ('fading-echo', 'game', false, 'Lançamento'),
    ('tears-of-metal', 'game', false, 'Lançamento'),
    ('dragonsword-awakening', 'game', false, 'Lançamento'),
    ('cultic', 'game', false, 'Lançamento'),
    ('tormentum-ii', 'game', false, 'Lançamento'),
    ('forever-skies', 'game', false, 'Lançamento'),
    ('go-north', 'game', false, 'Lançamento'),
    ('gothic-classic', 'game', false, 'Lançamento'),
    ('bloodrayne-definitive-collection', 'game', false, 'Lançamento'),
    ('exstetra-hd-remastered', 'game', false, 'Lançamento'),
    ('aretha-collection-1993-1995', 'game', false, 'Lançamento'),
    ('blue-reflection-quartet', 'game', false, 'Lançamento'),
    ('exstetra', 'game', false, 'Lançamento'),
    ('xenoblade-chronicles-2-switch-2-edition', 'game', false, 'Lançamento')
)
update public.release_radar_items release
set
  product_type = audit.product_type,
  is_indie = audit.is_indie,
  badge = audit.badge,
  updated_at = now()
from audit
where release.id = audit.id;

update public.release_radar_items
set
  product_type = 'dlc',
  is_indie = false,
  badge = 'DLC / Expansão',
  updated_at = now()
where id in ('starfield-dlc', 'witcher-expansion');

update public.release_radar_items
set game = 'Heartopia',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4025700/6752380746cc6ca97c3b3af3512ede6847124eb1/ss_6752380746cc6ca97c3b3af3512ede6847124eb1.1920x1080.jpg?t=1783671810',
  updated_at = now(),
  release_label = '16 de Janeiro',
  release_date = date '2026-01-16'
where id = 'heartopia';

update public.release_radar_items
set game = 'Blasten!!',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1494090/ss_1b4447eebec1fcc85eeb7bffef88620a7a27d979.1920x1080.jpg?t=1781162310',
  updated_at = now()
where id = 'blasten';

update public.release_radar_items
set game = 'Cozy Caravan',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2788520/f63969445f61638c3feedb043d03e03ea4242ec1/ss_f63969445f61638c3feedb043d03e03ea4242ec1.1920x1080.jpg?t=1767858782',
  updated_at = now(),
  release_label = '7 de Janeiro',
  release_date = date '2026-01-07'
where id = 'cozy-caravan';

update public.release_radar_items
set game = 'Pathologic 3',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3199650/73e44df664a5cbdf3d22d75494bb547fffdc6fd6/ss_73e44df664a5cbdf3d22d75494bb547fffdc6fd6.1920x1080.jpg?t=1778605937',
  updated_at = now()
where id = 'pathologic-3';

update public.release_radar_items
set game = 'S.P.E.A.R.',
  image_url = 'https://store-images.s-microsoft.com/image/apps.34321.14474803177493602.fc0be985-235a-4500-b3ec-d2f26a34cadc.97530099-5427-435e-92ab-1b1c63ee56e0?h=1080&q=90&w=1920',
  updated_at = now()
where id = 'spear';

update public.release_radar_items
set game = 'Quarantine Zone: The Last Check',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3419520/a6e1bd5ef23026f5f0e12abdf74015bde9edf184/ss_a6e1bd5ef23026f5f0e12abdf74015bde9edf184.1920x1080.jpg?t=1781533742',
  updated_at = now()
where id = 'quarantine-zone-the-last-check';

update public.release_radar_items
set game = 'Streetdog BMX',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2707870/ss_87306364afc05acc7b8fe9c2a2f88d4b5edbcc59.1920x1080.jpg?t=1768397837',
  updated_at = now()
where id = 'streetdog-bmx';

update public.release_radar_items
set game = 'Cassette Boy',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2334330/ss_89a6d2e94de772502c4610e84012a4d6eee32707.1920x1080.jpg?t=1770888009',
  updated_at = now(),
  release_label = '14 de Janeiro',
  release_date = date '2026-01-14'
where id = 'cassette-boy';

update public.release_radar_items
set game = 'The Legend of Heroes: Trails Beyond the Horizon',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3316940/98ae78c86324ce123e560d13d48aba72592042b5/ss_98ae78c86324ce123e560d13d48aba72592042b5.1920x1080.jpg?t=1771470581',
  updated_at = now()
where id = 'trails-beyond-the-horizon';

update public.release_radar_items
set game = 'BrokenLore: Unfollow',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2133830/b1bf909f7bdd5e601f3c7953d34d22a8deb14061/ss_b1bf909f7bdd5e601f3c7953d34d22a8deb14061.1920x1080.jpg?t=1781090500',
  updated_at = now(),
  release_label = '15 de Janeiro',
  release_date = date '2026-01-15'
where id = 'brokenlore-unfollow';

update public.release_radar_items
set game = 'Ghetto Zombies Graffiti Squad',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3047820/85932188b52ce427bb5f32c4f28f9b1abf81a21a/ss_85932188b52ce427bb5f32c4f28f9b1abf81a21a.1920x1080.jpg?t=1782855926',
  updated_at = now()
where id = 'ghetto-zombies-graffiti-squad';

update public.release_radar_items
set game = 'Carnedge',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3907920/d5566a8efdebe048353842e628e6474b63c7604e/ss_d5566a8efdebe048353842e628e6474b63c7604e.1920x1080.jpg?t=1768935030',
  updated_at = now()
where id = 'carnedge';

update public.release_radar_items
set game = 'Duet Night Abyss',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3950020/ac73b8642339f8f4f095de023fc1f36950276f59/ss_ac73b8642339f8f4f095de023fc1f36950276f59.1920x1080.jpg?t=1780564469',
  updated_at = now()
where id = 'duet-night-abyss';

update public.release_radar_items
set game = 'MIO: Memories In Orbit',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1672810/b32f6acd670ce78fa98486262b1986afaa64f760/ss_b32f6acd670ce78fa98486262b1986afaa64f760.1920x1080.jpg?t=1784714312',
  updated_at = now()
where id = 'mio-memories-in-orbit';

update public.release_radar_items
set game = 'Eldegarde',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2344320/eb50e04eb8eeb7fcb25f962d79ce64fa121fec33/ss_eb50e04eb8eeb7fcb25f962d79ce64fa121fec33.1920x1080.jpg?t=1773949199',
  updated_at = now()
where id = 'eldegarde';

update public.release_radar_items
set game = 'Gooey',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3689150/7da0175ff648fdea6bacfef7fb15a319dcc9b31a/ss_7da0175ff648fdea6bacfef7fb15a319dcc9b31a.1920x1080.jpg?t=1769054173',
  updated_at = now()
where id = 'gooey';

update public.release_radar_items
set game = 'TR-49',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3838370/3bc0adff5ae49cbcea90cc50909af18ee3052f76/ss_3bc0adff5ae49cbcea90cc50909af18ee3052f76.1920x1080.jpg?t=1771259279',
  updated_at = now()
where id = 'tr-49';

update public.release_radar_items
set game = 'Arknights: Endfield',
  image_url = 'https://web-static.hg-cdn.com/upload/image/20260119/6449fcc85a70c8fddea7df91051bb13f.png',
  updated_at = now()
where id = 'arknights-endfield';

update public.release_radar_items
set game = 'Hermit and Pig',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2408350/914b548c36c601ba6a6b27fc7e42651597834631/ss_914b548c36c601ba6a6b27fc7e42651597834631.1920x1080.jpg?t=1776777281',
  updated_at = now(),
  release_label = '5 de Fevereiro',
  release_date = date '2026-02-05'
where id = 'hermit-and-pig';

update public.release_radar_items
set game = 'Banquet For Fools',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3172700/c3aff2f40f3889c67e07184b6aeb358af9880cec/ss_c3aff2f40f3889c67e07184b6aeb358af9880cec.1920x1080.jpg?t=1782422770',
  updated_at = now(),
  release_label = '5 de Março',
  release_date = date '2026-03-05'
where id = 'banquet-for-fools';

update public.release_radar_items
set game = 'Escape from Ever After',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1996390/9530a3ab392c359295c16c34859999164b5379c6/ss_9530a3ab392c359295c16c34859999164b5379c6.1920x1080.jpg?t=1780594097',
  updated_at = now()
where id = 'escape-the-ever-after';

update public.release_radar_items
set game = 'The Fortress',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3459150/78de114a732d61bc483e7f9eab627a10724888f7/ss_78de114a732d61bc483e7f9eab627a10724888f7.1920x1080.jpg?t=1782220371',
  updated_at = now(),
  release_label = '22 de Janeiro',
  release_date = date '2026-01-22'
where id = 'the-fortress';

update public.release_radar_items
set game = 'Highguard',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4128260/dfdb7ab5ef35a501553d5f630c9812209c02728f/ss_dfdb7ab5ef35a501553d5f630c9812209c02728f.1920x1080.jpg?t=1773274959',
  updated_at = now()
where id = 'highguard';

update public.release_radar_items
set game = 'Conquest Tactics: Realm of Sin',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3308960/f2e4fe1345b6b3285984429cc7c633215e159807/ss_f2e4fe1345b6b3285984429cc7c633215e159807.1920x1080.jpg?t=1784106874',
  updated_at = now()
where id = 'conquest-tactics';

update public.release_radar_items
set game = 'Earth Must Die',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3639780/a3ad474f6b45bf7148068eeccef0e8966e604eab/ss_a3ad474f6b45bf7148068eeccef0e8966e604eab.1920x1080.jpg?t=1769538597',
  updated_at = now()
where id = 'earth-must-die';

update public.release_radar_items
set game = 'Rightfully, Beary Arms',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1928030/ss_ede2e7f7ca3869bde4beb5051ca837a2cf3c2052.1920x1080.jpg?t=1769525479',
  updated_at = now()
where id = 'rightfully-beary-arms';

update public.release_radar_items
set game = 'Underground Garage',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1452250/ss_20da0ff378ab706d4c3a3ef67cb45e158df50c57.1920x1080.jpg?t=1770381764',
  updated_at = now()
where id = 'underground-garage';

update public.release_radar_items
set game = 'Lanesplit',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3278310/71563e5f14c64a10d0adef142c1b9f513836dafc/ss_71563e5f14c64a10d0adef142c1b9f513836dafc.1920x1080.jpg?t=1782741920',
  updated_at = now()
where id = 'lanesplit';

update public.release_radar_items
set game = 'The Seven Deadly Sins: Origin',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3679080/53373b98ce2cec50ffdf76f7cd072aa8f6eda7d2/ss_53373b98ce2cec50ffdf76f7cd072aa8f6eda7d2.1920x1080.jpg?t=1782362949',
  updated_at = now(),
  release_label = '16 de Março',
  release_date = date '2026-03-16'
where id = 'seven-deadly-sins-origin';

update public.release_radar_items
set game = 'Cairn',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1588550/bf1a0195af2a834226b5747bb0c304f36b55072c/ss_bf1a0195af2a834226b5747bb0c304f36b55072c.1920x1080.jpg?t=1782391789',
  updated_at = now()
where id = 'cairn';

update public.release_radar_items
set game = 'Dark Auction',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2363180/001d38ed8652369883903440adf8ef2533034105/ss_001d38ed8652369883903440adf8ef2533034105.1920x1080.jpg?t=1772510193',
  updated_at = now(),
  release_label = '28 de Janeiro',
  release_date = date '2026-01-28'
where id = 'dark-auction';

update public.release_radar_items
set game = 'I Hate This Place',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2604490/13123e621adf64da82114abda8654c5b01fca728/ss_13123e621adf64da82114abda8654c5b01fca728.1920x1080.jpg?t=1770213560',
  updated_at = now()
where id = 'i-hate-this-place';

update public.release_radar_items
set game = 'Space Warlord Baby Trading Simulator',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3642000/8c5c0e3313f8efe0e39d9fc19de5aecb52abf4c2/ss_8c5c0e3313f8efe0e39d9fc19de5aecb52abf4c2.1920x1080.jpg?t=1770222474',
  updated_at = now()
where id = 'space-warlord-baby-trading-simulator';

update public.release_radar_items
set game = 'Ufophilia',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3851320/5c8e907c8ed2d9f75a41d3141f66c5f34decb750/ss_5c8e907c8ed2d9f75a41d3141f66c5f34decb750.1920x1080.jpg?t=1777363166',
  updated_at = now()
where id = 'ufophilia';

update public.release_radar_items
set game = 'CODE VEIN II',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2362060/164032cfc179a005dcc601c2ba11e29faa407cf1/ss_164032cfc179a005dcc601c2ba11e29faa407cf1.1920x1080.jpg?t=1782293908',
  updated_at = now(),
  release_label = '29 de Janeiro',
  release_date = date '2026-01-29'
where id = 'code-vein-2';

update public.release_radar_items
set game = 'Folklore Hunter',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/696220/86ac125b60c383a2eca7995dced94b9b579758d8/ss_86ac125b60c383a2eca7995dced94b9b579758d8.1920x1080.jpg?t=1771627157',
  updated_at = now()
where id = 'folklore-hunter';

update public.release_radar_items
set game = 'My Tiny Garden',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3719580/ab8882bc27f1bfdf392d72f863c70dcc621c8bae/ss_ab8882bc27f1bfdf392d72f863c70dcc621c8bae.1920x1080.jpg?t=1779156159',
  updated_at = now()
where id = 'my-tiny-garden';

update public.release_radar_items
set game = 'Occupy Mars: The Game',
  image_url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/758690/ss_e78b6c974590383d8e92cfd5dd23e07bd1f01b6c.1920x1080.jpg?t=1782483603',
  updated_at = now()
where id = 'occupy-mars-the-game';
