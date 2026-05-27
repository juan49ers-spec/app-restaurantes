create unique index if not exists idx_unique_open_portal_meeting_request
  on public.portal_meeting_requests (restaurant_id, report_id)
  where status in ('PENDING', 'ACKNOWLEDGED');
