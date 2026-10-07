begin;

create or replace function public.community_feed_page(
  page_offset integer default 0,
  search_text text default '',
  platform_filter text default '',
  article_filter text default '',
  topic_filter text default '',
  post_filter text default '',
  feed_order text default 'latest'
) returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with filtered as (
    select p.*,
      (select count(*) from public.community_comments c where c.post_id = p.id) as comments_count,
      (select count(*) from public.community_posts s where s.shared_post_id = p.id or s.attached_article->>'original_post_id' = p.id::text) as shares_count,
      (select count(*) from public.community_reactions r where r.post_id = p.id and r.reaction_type = 'hype') as hype_count
    from public.community_posts p
    where (search_text = '' or p.content ilike '%' || left(search_text, 80) || '%' or p.author_name ilike '%' || left(search_text, 80) || '%' or p.author_username ilike '%' || left(search_text, 80) || '%')
      and (platform_filter = '' or p.platform_tag = platform_filter)
      and (article_filter = '' or p.attached_article->>'slug' = article_filter or p.attached_article->'original_attached_article'->>'slug' = article_filter)
      and (topic_filter = '' or p.topic_id::text = topic_filter)
      and (post_filter = '' or p.id::text = post_filter)
      and (feed_order <> 'following' or exists (
        select 1 from public.current_user_follow_values() f where (
          (f.follow_type = 'profile' and lower(f.follow_value) = lower(p.author_username))
          or (f.follow_type = 'platform' and f.follow_value = p.platform_tag)
          or (f.follow_type = 'topic' and f.follow_value = p.topic_id::text)
        )
      ))
  ), page as (
    select f.*, row_number() over (order by
      case when feed_order = 'trending' then f.comments_count * 3 + f.hype_count + f.shares_count * 2 else 0 end desc,
      f.is_pinned desc, f.created_at desc, f.id desc
    ) as position
    from filtered f
    order by
      case when feed_order = 'trending' then f.comments_count * 3 + f.hype_count + f.shares_count * 2 else 0 end desc,
      f.is_pinned desc, f.created_at desc, f.id desc
    limit 21 offset greatest(0, least(coalesce(page_offset, 0), 10000))
  ), enriched as (
    select to_jsonb(p) || jsonb_build_object(
      'reactions', jsonb_build_object(
        'hype', p.hype_count,
        'flop', (select count(*) from public.community_reactions r where r.post_id = p.id and r.reaction_type = 'flop'),
        'salty', (select count(*) from public.community_reactions r where r.post_id = p.id and r.reaction_type = 'salty')
      ),
      'user_reaction', (select r.reaction_type from public.community_reactions r where r.post_id = p.id and r.user_id = auth.uid())
    ) as item, p.position
    from page p order by p.position limit 20
  )
  select jsonb_build_object(
    'posts', coalesce((select jsonb_agg(e.item order by e.position) from enriched e), '[]'::jsonb),
    'has_more', (select count(*) > 20 from page)
  );
$$;

revoke all on function public.community_feed_page(integer, text, text, text, text, text, text) from public;
grant execute on function public.community_feed_page(integer, text, text, text, text, text, text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';

commit;
