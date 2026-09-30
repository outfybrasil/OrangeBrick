alter table public.contact_submissions
  add column if not exists subject text,
  add column if not exists is_read boolean not null default false;

update public.contact_submissions
set subject = nullif(company, 'Geral')
where subject is null;

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);
