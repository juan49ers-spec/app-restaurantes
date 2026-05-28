alter table if exists public.alert_notifications
  alter column rule_id drop not null;
