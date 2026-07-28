create or replace function public.username_available(candidate_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.normalize_username(candidate_username) = lower(candidate_username)
    and char_length(candidate_username) between 3 and 30
    and (
      candidate_username not in ('admin', 'api', 'auth', 'brickboard', 'configuracoes', 'orange-brick', 'orangebrick', 'perfil', 'profile')
      or public.current_user_is_admin()
    )
    and not exists (
      select 1
      from public.profiles
      where lower(username) = lower(candidate_username)
        and user_id <> auth.uid()
    );
$$;

grant execute on function public.username_available(text) to authenticated;
