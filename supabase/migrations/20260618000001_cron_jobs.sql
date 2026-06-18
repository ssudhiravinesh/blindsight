-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Reset free tier scan counts at midnight UTC
SELECT cron.schedule(
  'reset-daily-scans',
  '0 0 * * *',  -- midnight UTC
  $$
  UPDATE anon_users SET scans_today = 0
  WHERE last_scan_date < CURRENT_DATE;
  $$
);

-- Weekly: clean expired cache entries at 4:00 AM UTC every Sunday
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 4 * * 0',  -- 4:00 AM UTC every Sunday
  $$
  DELETE FROM tos_cache WHERE expires_at < now();
  $$
);

-- Daily: crawl tracked domains for ToS changes at 3:00 AM UTC
-- We call the Edge Function "monitor-tos-changes"
SELECT cron.schedule(
  'monitor-tos-changes',
  '0 3 * * *',  -- 3:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'http://localhost:54321/functions/v1/monitor-tos-changes',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
