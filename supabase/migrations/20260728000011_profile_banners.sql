alter table public.profiles
add column if not exists banner_url text;

alter table public.profiles
drop constraint if exists profiles_banner_url_check;

alter table public.profiles
add constraint profiles_banner_url_check
check (banner_url is null or banner_url ~ '^https://');
