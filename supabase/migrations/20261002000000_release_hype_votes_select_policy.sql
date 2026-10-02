drop policy if exists release_hype_votes_select on public.release_hype_votes;
create policy release_hype_votes_select on public.release_hype_votes
for select to authenticated
using (auth.uid() = user_id);
