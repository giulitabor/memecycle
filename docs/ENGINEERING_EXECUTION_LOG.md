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

### Stage 1 — Monitor scheduler repair (implemented; production verification pending)
- Rebuilt `api/cron/monitor.js` to derive the Supabase Edge Function URL from `new URL(SUPABASE_URL).origin`, validate HTTPS/Supabase host, preserve bearer auth, and include non-secret trigger metadata.
- Reduced the scheduled monitor batch to 5 records and disabled historical candle backfill on the cron path so the daily trigger is less likely to exceed serverless execution limits. Candle backfill can be run separately.
- Vercel preview deployment `dpl_ERU4Ud7QpXkaTcdmrDhgguYRCHTL` reached READY at commit `cf3fbee28f1d86adbb06efd251907d7e1c1e5550`. It predates later admin-console and recovery-policy commits; a fresh preview build is required.
- Production monitor run is not yet verified. Wait for a scheduled execution or use an authenticated admin trigger after preview validation.

### Stage 2 — Historical discovery expansion (implemented on branch; archive access unverified)
- Added a Bitquery Pump.fun archive adapter to `memecycle-worker`, using the existing Vercel `BITQUERY_TOKEN` variable passed in the `x-bitquery-token` request header. The token is not written to logs or database rows.
- Backfill uses one bounded UTC day per discovery run, max 100 create/create_v2 launch records, records creator signer, signature, mint metadata, update authority and source provenance, and advances a daily cursor only on success.
- Source coverage is explicitly a capped sample, not a complete launch census. Bitquery archive access is plan-gated; no purchase or upgrade has been made. If archive access is unavailable, the worker records a source error and does not advance the cursor.
- Discovery worker deployed to Supabase as `memecycle-worker` v11 ACTIVE. The production Vercel cron route has not yet been updated because branch preview validation/merge remains outstanding.

### Stage 3 — On-chain investigation (implemented/deployed; live run pending)
- Added `memecycle-revival` Edge Function v1 ACTIVE. It processes at most 3 tokens per run and records parsed mint supply/decimals, mint and freeze authorities, top-20 token-account distribution with explicit vault/program-account caveats, primary-pool latest signature, and a candidate creator only where the oldest available mint-account transaction contains initializeMint.
- Pump.fun early-bundle fields are stored as provider-reported third-party evidence, not represented as independently reconstructed on-chain bundle proof.
- Each token receives a versioned research assessment and a queued-job record. No token visibility is changed; no wallet, transaction, transfer or contact actions are performed.
- The on-chain worker has not yet completed a production invocation; API credentials and provider response shape must be validated by the first scheduled/manual run.

### Stage 4 — Evidence-weighted revival scoring (implemented and unit tested)
- Added independent dormancy, technical viability, community signal, authority clarity, data confidence, risk and opportunity dimensions. Missing fields remain unmeasured; they are not silently treated as positive evidence.
- A `revival_candidate` status requires at least 70% measured data coverage, minimum viability/community thresholds, independently verified project authority, and explicitly granted consent.
- Added Node test runner and 5 scoring tests; all 5 passed in local Node test execution.
- Added schema-backed `mc_revival_assessments`, `mc_onchain_evidence`, `mc_research_jobs`, `mc_project_identities`, `mc_revival_cases`, and `mc_revival_case_events` tables. Migration `revival_intelligence_foundation` applied successfully to Supabase.

### Stage 5 — AI research dossiers (enhanced; provider key still user-managed)
- Extended the existing admin-only `api/admin/research.js` evidence packet to include on-chain evidence, revival assessments, project identity/authority/consent, recovery cases and case-event history.
- Added job queue tracking around AI dossier generation. Existing DeepSeek/Vercel provider selection and evidence-reference validation remain in place.
- The `DEEPSEEK_API_KEY` remains a user-managed environment variable. No key was read, created or exposed. Without a configured provider, the existing route returns a configuration error rather than inventing an AI report.

### Stage 6 — Project identity, authority and consent (backend implemented)
- Added admin-only `api/admin/recovery.js` identity updates for official project name/site/social links/public contact channels and provenance evidence.
- Wallet control, candidate authority and independently verified authority are distinct states. Independently verified authority requires at least two distinct HTTPS evidence sources of approved evidence types.
- Granted consent requires independently verified authority plus an explicit-project-consent evidence record. No third-party outreach is performed.

### Stage 7 — Recovery case management (backend and private UI implemented; browser workflow test pending)
- Added admin-only case creation, status transitions, plan updates and internal notes. State transitions are explicit; planning/approval are blocked until independent authority and consent gates are met.
- Approval requires an explicit admin confirmation and a meaningful approval note. Approval records an internal decision only; it does not trigger an on-chain or external action.
- Added a private `/admin` console for admin login, dossier generation, case creation, identity/consent evidence entry, case transitions, internal notes and report review.
- Added shared recovery-policy helper and 4 tests covering allowed transitions, distinct authority evidence, explicit consent, and the planning gate; all 4 passed in local Node test execution.
- Combined local policy/scoring coverage: 9 tests passed across the two test files.

### Outstanding verification / release gates
- Build a fresh Vercel preview from the latest branch head; verify `/admin` loads and serverless API bundles compile.
- Confirm Supabase Edge Function `memecycle-worker` v11 can call Bitquery archive using the configured token; if plan-gated, keep the source paused and preserve the cursor.
- Trigger one controlled on-chain investigation run and inspect `mc_onchain_evidence`, `mc_revival_assessments`, and `mc_research_jobs`.
- Verify the corrected monitor cron produces a persisted `run_type='monitor'` row.
- Verify admin sign-in with an actual admin-role account and test research/case workflow end to end.
- Re-run Supabase security advisors. Leaked-password protection remains a dashboard-level auth configuration item; RLS-only internal tables intentionally have no client policies.

### Security follow-up — explicit internal-table deny policies
- Added and applied migration `internal_table_deny_policies` for AI research reports, audit events, on-chain evidence, project identities, research jobs, revival assessments, revival cases and case events.
- Policies explicitly deny all client-role operations (`anon`, `authenticated`) while preserving service-role server access.
- Re-ran Supabase security advisors: the eight RLS-without-policy findings are cleared. The only remaining security warning is Supabase Auth leaked-password protection disabled; no supported in-chat auth-configuration action is available, so this remains a dashboard configuration task.
