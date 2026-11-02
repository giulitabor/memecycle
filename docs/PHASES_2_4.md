# MEMECYCLE Phases 2–4: Discovery, Vault & Intelligence

## Delivered capabilities
- **Phase 2 — Discovery:** DexScreener token profiles, latest boosts and GeckoTerminal Solana trending pools. Candidate mint addresses are validated, deduplicated and enriched with token-pair market data.
- **Phase 3 — Historical vault:** normalized pool state, timestamped market snapshots, raw provider observations, source provenance, ingestion run history, discovery events and explicit data-gap records.
- **Phase 4 — Intelligence:** versioned, explainable rule-based lifecycle classification and a 0–100 reclamation research score. It is not a valuation, investment signal, AI prediction or proof of abandonment.

## Classification safeguards
- Public market observations do not establish the last on-chain transaction or holder activity.
- The worker may label observed markets `active`, `declining`, `illiquid` or `unverified`.
- It never automatically labels a token `abandoned`, `dormant`, `historical` or `community_revival`; those require historical chain evidence and/or human review.
- New records remain `visibility = private`. Discovery never publishes records automatically.
- Missing metadata remains unknown; source provenance and data gaps are recorded.

## Supabase Edge Function
Function: `memecycle-worker`, POST `/functions/v1/memecycle-worker`.  
Body: `{"action":"discover","limit":30}` or `{"action":"health"}`.  
Authorization: `Bearer <SUPABASE_SERVICE_ROLE_KEY>`.

The Supabase Edge runtime supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Gateway JWT verification is disabled because the worker performs its own exact bearer-key check against the server-side service-role key before doing any work. Never expose this key to a browser or put it in a `VITE_*` variable.

## Vercel daily runner
A daily Vercel Cron schedule at 07:00 UTC calls `/api/cron/discover`. Add these server-only Production environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | MEMECYCLE project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | MEMECYCLE service-role key |
| `CRON_SECRET` | A long random secret you generate |

Vercel Cron authenticates with `Authorization: Bearer <CRON_SECRET>`; the route then invokes the Edge Function. Do not send keys in chat. Redeploy after setting the variables. You can manually trigger the route with an authenticated GET request to `/api/cron/discover`.

## Tables
`mc_discovery_sources` provider health; `mc_ingestion_runs` job outcomes; `mc_token_pairs` normalized DEX pools; `mc_token_events` lifecycle events; `mc_data_gaps` missing fields; extended `mc_tokens` and `mc_snapshots` for price, FDV, pool identifiers, provenance and scoring version.

## Limits and next integration
Each run samples at most 30 candidates (hard cap 50) to respect public provider limits. Coverage and uptime vary by provider. A daily run builds a daily observation series; it is not a historical on-chain backfill. Helius can later be added as a separate adapter for transaction history, holder counts and stronger inactivity evidence.

## Verification
1. Confirm the Edge Function is deployed.
2. Add the three server-only Vercel variables.
3. Trigger `/api/cron/discover` manually.
4. Inspect `mc_ingestion_runs`, `mc_tokens`, `mc_token_pairs` and `mc_snapshots`.
5. Review Supabase security/performance advisors.
6. Manually review candidates before setting `visibility='public'`.


## Stage 2 — Historical archive and data quality
- Public token detail views read only records with `visibility='public'`.
- Detail views display recorded price observations, pool records, classification history, source provenance, observed events and unresolved data gaps.
- Price plots use actual snapshots only; the interface does not interpolate missing observations.
- Search filters are restricted to the worker's current output labels: `active`, `declining`, `illiquid`, and `unverified`.
- Data-quality coverage and lifecycle classification remain separate concepts.

## Stage 3 — Reclamation review and publication controls
- Public visitors may submit a Solana mint and evidence URLs. Submissions remain pending and do not publish tokens.
- An authenticated moderation workspace is included in the site footer.
- Admin authorization uses the trusted JWT `app_metadata.role = 'admin'` claim. Never use editable `user_metadata` for authorization.
- Create an Auth user in Supabase, then set `app_metadata.role` to `admin` for that user in the Supabase Dashboard. Do not put the role in user-editable metadata.
- Admins can move a submission through pending/under-review/approved/rejected and can separately publish private token candidates. Approving a community submission does not automatically publish or relabel a token.
- Token publication is a deliberate human action. New worker discoveries stay private.
- The moderation UI uses the signed-in user's Supabase session; database RLS independently enforces every read and update.

## Stage 2/3 deployment checklist
1. Apply migration `202611020003_phase_2_3_archive_moderation.sql`.
2. Deploy the Vite app from the feature branch and check the Vercel Preview build.
3. Confirm public users cannot read private tokens, private snapshots or pending submissions.
4. Sign in using an Auth account whose trusted app metadata contains `role: admin`; verify the moderation queue works.
5. Submit a test reclamation case and confirm it is visible only to admins.
6. Publish one reviewed test token only after checking its identity and evidence.
7. Verify the public token detail page shows actual snapshots and provenance.
