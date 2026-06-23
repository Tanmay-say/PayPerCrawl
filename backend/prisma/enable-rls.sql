-- PayPerCrawl — fix Supabase "RLS Disabled in Public" linter errors (lint 0013).
--
-- WHY THIS IS SAFE:
-- The backend talks to Postgres through Prisma using the `postgres` role
-- (DATABASE_URL / DIRECT_URL). That role has BYPASSRLS, so every query the API
-- makes keeps working exactly as before. RLS only gates the roles PostgREST uses
-- (`anon` / `authenticated`) — i.e. the public REST/GraphQL endpoint Supabase
-- exposes on the internet. This app never uses that endpoint, so enabling RLS
-- with NO policies = "deny all public REST access" without touching the app.
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Idempotent: safe to run multiple times.

ALTER TABLE public."User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Site"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CrawlEvent"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SiweNonce"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- No policies are created on purpose: with RLS enabled and zero policies,
-- the public PostgREST roles (anon/authenticated) can read/write nothing,
-- while the Prisma connection (BYPASSRLS) is unaffected.

-- ---------------------------------------------------------------------------
-- Verify (optional): every row below should show rowsecurity = true
-- ---------------------------------------------------------------------------
-- SELECT relname, relrowsecurity AS rowsecurity
-- FROM pg_class
-- WHERE relnamespace = 'public'::regnamespace
--   AND relname IN ('User','Site','CrawlEvent','SiweNonce','_prisma_migrations');
