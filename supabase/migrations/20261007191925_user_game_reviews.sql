alter table public.user_game_tracking
  add column if not exists rating numeric(3,1),
  add column if not exists review_text text,
  add column if not exists is_public boolean not null default true;

alter table public.user_game_tracking
  drop constraint if exists user_game_tracking_status_check,
  add constraint user_game_tracking_status_check
    check (status in ('garanti', 'radar', 'passo', 'joguei')),
  add constraint user_game_tracking_rating_check
    check (rating is null or (rating between 0 and 10 and rating * 2 = trunc(rating * 2))),
  add constraint user_game_tracking_review_text_check
    check (review_text is null or char_length(review_text) <= 280),
  add constraint user_game_tracking_review_status_check
    check (status = 'joguei' or (rating is null and review_text is null));

create index if not exists user_game_tracking_profile_idx
  on public.user_game_tracking (user_id, updated_at desc)
  where status = 'joguei';
