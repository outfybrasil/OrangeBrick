begin;

create or replace function public.community_poll_results(p_poll_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with vote_counts as (
    select v.option_index, count(*) as vote_count
    from public.community_poll_votes v
    where v.poll_id = p_poll_id
    group by v.option_index
  )
  select jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(c.option_index::text, c.vote_count) from vote_counts c), '{}'::jsonb),
    'total_votes', coalesce((select sum(c.vote_count) from vote_counts c), 0),
    'user_voted_option', (
      select v.option_index
      from public.community_poll_votes v
      where v.poll_id = p_poll_id and v.user_id = auth.uid()
      limit 1
    )
  );
$$;

revoke all on function public.community_poll_results(uuid) from public, anon, authenticated;
grant execute on function public.community_poll_results(uuid) to anon, authenticated, service_role;
create index if not exists community_poll_votes_poll_option_idx on public.community_poll_votes(poll_id, option_index);
notify pgrst, 'reload schema';

commit;
