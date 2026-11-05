# MEMECYCLE Engineering Execution Log

Project: MEMECYCLE
Repository: https://github.com/giulitabor/memecycle
Working branch: `agent/memecycle-seven-stage`
Production baseline: `07543267b717aa3d4ea4706f251497698f617cd7`
Supabase project: `asyswmxkdpidaghrdffa`
Started: 2026-11-05 (Europe/Rome)

## Operating rules
- Maintain this log after each meaningful implementation/test milestone.
- Distinguish implemented, locally/unit tested, deployed, and production-verified.
- Never infer project abandonment from low liquidity or missing market pairs alone.
- Wallet signature proves control of the signing wallet only, not token ownership, creator authority, or permission to relaunch.
- No wallet transactions, transfers, trades, token deployments, third-party outreach, or public revival announcements without separate user approval.
- Keep private candidate data private until evidence/review gates are satisfied.
- Do not expose secrets in logs, source, responses, or test fixtures.

## Baseline audit (2026-11-05)
### Confirmed
- Supabase Edge Functions: `memecycle-worker` v10 ACTIVE, `memecycle-monitor` v12 ACTIVE, `memecycle-community` v1 ACTIVE.
- Vercel production aliases and production deployment previously verified READY.
- Discovery worker completed five successful runs. Latest run: 2026-11-05 07:59 UTC; 124 candidates, 30 upserts, 30 snapshots, zero record/source errors.
- Current database: 150 tokens, 149 snapshots, 150 events, 150 classifications, 149 pairs, 5 ingestion runs, 1 AI report.
- Public records: 5, all currently classified declining; private records: 145.
- Monitor runs: zero.
- Abandonment assessments: zero.
- Reclamation cases: zero.
- The existing monitor samples only the latest signature of up to three primary pool accounts per run. This is not comprehensive token transfer or holder-wallet history.
- Existing revival/dormancy logic is a narrow rule-based signal; it is not a full revival research workflow.
- Vercel environment variable names include CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and HELIUS_RPC (values intentionally not copied here).
- Supabase security advisor: leaked-password protection disabled; RLS enabled but no policies on mc_ai_research_reports and mc_audit_events. Review and remediate safely.
- Vercel runtime errors query (24h) returned no runtime error clusters. Runtime log retention unavailable on current plan for a 24h query; do not interpret as no logs.

## Seven-stage delivery plan
1. Repair and verify monitor scheduling, authentication, and run observability.
2. Expand historical token discovery/backfill with source provenance and rate limits.
3. Add deeper on-chain intelligence: mint/metadata authorities, supply/holders, creator/deployer links, bundled-launch evidence, and transaction activity with explicit coverage limitations.
4. Build evidence-weighted dormancy, viability, and revival-opportunity ranking; keep independent dimensions separate.
5. Add AI-assisted research dossiers with citations/evidence manifests, deterministic fallback, and spend limits.
6. Add project identity, ownership/authority and community-contact verification workflow; no unsolicited outreach.
7. Add recovery case management, consent gates, review history and audit trail.

## Work entries
### 2026-11-05 — Session start
- Created isolated working branch `agent/memecycle-seven-stage` from production baseline.
- Read current discovery/monitor/community functions, cron routes, database state, migrations list, Vercel environment-variable names, and Supabase security/performance advisors.
- No production code or database changes made during baseline audit.
- Next: fix monitor cron route, add tests and stage-by-stage implementation.

### Stage 1 — Monitor scheduler repair (implemented on working branch)
- Confirmed the production Vercel cron configuration schedules discovery at 07:00 UTC and monitoring at 08:00 UTC.
- Confirmed Vercel has production environment-variable entries for CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and HELIUS_RPC; secret values were not read or copied into this log.
- Confirmed discovery cron has executed daily, but there are zero monitor ingestion runs. This isolates the missing monitoring activity to the monitor path rather than the entire cron system.
- Reworked `api/cron/monitor.js` to validate the configured Supabase URL, construct the function endpoint from URL.origin (avoiding the malformed trailing-slash regular expression), preserve bearer authentication, return worker JSON and attach non-secret trigger metadata.
- Tests still required: route syntax/build, authorised/unauthorised invocation, successful Supabase monitor execution, and evidence of a persisted monitor run.
- Safety note: monitor currently samples at most three latest signatures on pool accounts per run; this is not full token-holder transaction history. No abandonment claim may be inferred from this limited sample.
