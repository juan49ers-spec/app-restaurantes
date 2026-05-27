alter table public.professional_report_drafts
  add column if not exists viewed_at timestamptz;

create index if not exists idx_professional_report_drafts_viewed
  on public.professional_report_drafts (restaurant_id, viewed_at desc)
  where viewed_at is not null;
