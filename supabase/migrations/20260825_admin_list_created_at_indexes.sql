-- ─────────────────────────────────────────────────────────────────────────────
-- Admin list-page ordering indexes
--
-- NOT YET APPLIED to any environment — review before running.
--
-- Every admin list page orders by `created_at DESC` and now pages with
-- LIMIT/OFFSET. None of these four tables has an index on `created_at`, so
-- Postgres must sequentially scan the whole table and sort it before it can
-- return even ten rows. Measured on production (2026-08-25):
--
--   contributions (5,556 rows): Seq Scan + quicksort → 133 ms execution
--   profiles      (  609 rows): Seq Scan + quicksort →  15 ms execution
--
-- At today's volumes that is not the dominant cost — the 4.9 MB payload was —
-- so these indexes are about keeping paging O(page) instead of O(table) as the
-- platform grows. `contributions` is the one that matters: it is the highest-
-- growth table in the product, and the Transactions page reads it on every view.
--
-- The tiebreaker column matches the queries, which order by (created_at DESC,
-- id ASC) so that rows sharing a timestamp cannot shuffle between pages.
--
-- CONCURRENTLY keeps writes flowing while each index builds. It cannot run
-- inside a transaction block, so apply these one statement at a time (the
-- Supabase SQL editor and `psql -f` both do this correctly; note that
-- `supabase db push` wraps migrations in a transaction, in which case drop the
-- CONCURRENTLY keyword — these tables are small enough that the brief lock is
-- measured in milliseconds).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contributions_created_at_id
  ON public.contributions (created_at DESC, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawals_created_at_id
  ON public.withdrawals (created_at DESC, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_created_at_id
  ON public.collections (created_at DESC, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at_id
  ON public.profiles (created_at DESC, id);

-- Rollback:
--   DROP INDEX CONCURRENTLY IF EXISTS public.idx_contributions_created_at_id;
--   DROP INDEX CONCURRENTLY IF EXISTS public.idx_withdrawals_created_at_id;
--   DROP INDEX CONCURRENTLY IF EXISTS public.idx_collections_created_at_id;
--   DROP INDEX CONCURRENTLY IF EXISTS public.idx_profiles_created_at_id;
