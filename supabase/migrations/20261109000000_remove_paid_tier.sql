-- Blind-Sight is free and open: drop the paid-tier / daily-quota model.
-- Abuse protection is handled by request rate limiting instead.

SELECT cron.unschedule('reset-daily-scans')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-daily-scans');

DROP TABLE IF EXISTS user_accounts;

ALTER TABLE anon_users
    DROP COLUMN IF EXISTS tier,
    DROP COLUMN IF EXISTS scans_today,
    DROP COLUMN IF EXISTS last_scan_date;
