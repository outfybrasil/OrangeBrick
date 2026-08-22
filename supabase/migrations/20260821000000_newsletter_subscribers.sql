-- Newsletter subscribers: tabela fora do controle de versão até agora.
-- Nenhuma policy é criada de propósito: anon/authenticated não podem ler
-- (lista de e-mails é PII). Somente service_role grava/lê.

create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'newsletter_subscribers_email_key'
      and conrelid = 'public.newsletter_subscribers'::regclass
  ) then
    begin
      alter table public.newsletter_subscribers
        add constraint newsletter_subscribers_email_key unique (email);
    exception when others then
      null;
    end;
  end if;
end $$;

alter table public.newsletter_subscribers enable row level security;

revoke all on public.newsletter_subscribers from anon, authenticated;
