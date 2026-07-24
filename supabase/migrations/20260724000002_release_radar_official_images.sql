update public.release_radar_items
set
  image_url = 'https://blog.playstation.com/tachyon/2026/07/64aab9113b761b758ab61bf8efd60337f9b2bffa.jpg',
  updated_at = now()
where id = 'wolverine';

update public.release_radar_items
set
  image_url = case id
    when 'gears-eday' then 'https://xboxwire.thesourcemediaassets.com/sites/2/2026/06/Gears-f783604b4900f089e04e-1024x576.jpg'
    when 'cod-mw4' then 'https://blog.playstation.com/tachyon/2028/05/898360a33ff3150179a7f1fd9dd4a3f4e90f680e-scaled.png'
    when 'gta-6' then 'https://www.rockstargames.com/VI/_next/static/media/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg?akim=1&imdensity=1&imwidth=3840'
    else image_url
  end,
  updated_at = now()
where id in ('gears-eday', 'cod-mw4', 'gta-6');
