-- Security invariants for the public schema. Run with `supabase test db`.
BEGIN;
SELECT plan(12);

-- Every table in public has RLS enabled and forced.
SELECT is(
  (SELECT count(*)::int FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
      AND NOT (relrowsecurity AND relforcerowsecurity)),
  0,
  'all public tables have RLS enabled and forced'
);

-- The API roles have no table privileges at all.
SELECT is(
  (SELECT count(*)::int FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')),
  0,
  'anon/authenticated hold no table or view grants'
);

SELECT ok(NOT has_function_privilege('anon', 'public.increment_cache_hit(uuid)', 'EXECUTE'),
  'anon cannot call increment_cache_hit');
SELECT ok(NOT has_function_privilege('anon', 'public.consume_rate_limit(text,integer,integer)', 'EXECUTE'),
  'anon cannot call consume_rate_limit');
SELECT ok(NOT has_function_privilege('authenticated', 'public.consume_rate_limit(text,integer,integer)', 'EXECUTE'),
  'authenticated cannot call consume_rate_limit');
SELECT ok(has_function_privilege('service_role', 'public.consume_rate_limit(text,integer,integer)', 'EXECUTE'),
  'service_role can call consume_rate_limit');

SELECT ok(
  (SELECT 'security_invoker=true' = ANY(reloptions) FROM pg_class WHERE oid = 'public.monitored_domains'::regclass),
  'monitored_domains is a security_invoker view'
);

SELECT is(
  (SELECT count(*)::int FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND prosecdef
      AND NOT coalesce(array_to_string(proconfig, ',') LIKE '%search_path=%', false)),
  0,
  'every SECURITY DEFINER function pins search_path'
);

-- Paid-tier artefacts are gone.
SELECT hasnt_column('public', 'anon_users', 'tier', 'anon_users.tier dropped');
SELECT hasnt_table('public', 'user_accounts', 'user_accounts dropped');

-- Rate limiter is atomic and enforces the limit within a window.
SELECT is(
  ARRAY[
    public.consume_rate_limit('pgtap:test', 2, 3600),
    public.consume_rate_limit('pgtap:test', 2, 3600),
    public.consume_rate_limit('pgtap:test', 2, 3600)
  ],
  ARRAY[true, true, false],
  'consume_rate_limit allows `limit` calls then refuses'
);

SELECT throws_ok(
  $$ SELECT public.consume_rate_limit('pgtap:bad', 0, 60) $$,
  'invalid rate limit parameters'
);

SELECT * FROM finish();
ROLLBACK;
