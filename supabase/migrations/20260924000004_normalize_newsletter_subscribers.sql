lock table public.newsletter_subscribers in access exclusive mode;

delete from public.newsletter_subscribers as older
using public.newsletter_subscribers as newer
where lower(btrim(older.email)) = lower(btrim(newer.email))
  and (
    older.created_at > newer.created_at
    or (older.created_at = newer.created_at and older.ctid > newer.ctid)
  );

update public.newsletter_subscribers
   set email = lower(btrim(email))
 where email <> lower(btrim(email));

create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (email);
