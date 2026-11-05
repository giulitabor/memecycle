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

### Stage 7 UI follow-up — opportunity ranking and recovery-plan controls
- Extended the admin recovery API with a ranked opportunity queue backed by versioned revival assessments, token metadata and identity/case status.
- Extended `/admin` with a ranked candidate list, one-click internal case creation linked to the assessment, public contact-channel evidence entry, consent-gated recovery plan/risk-register editing, and case history notes.
- This remains an internal research console. It does not publish candidate records, send outreach, or execute blockchain operations.

### Production release — 2026-11-05
- Pull request #2 merged to `main`: https://github.com/giulitabor/memecycle/pull/2
- Merge commit: `337cbf9cd4d28088095d6cfd0fd002597af659ae`.
- Vercel production deployment: `dpl_978u6zVs1wbLY7dr4WtvUccjYPP2`, state READY, commit matches merge commit.
- Explicitly assigned `memecycle.vercel.app` to the new production deployment; deployment alias read-back confirmed `aliasError: null`.
- Vercel production runtime error scan (last hour) returned no runtime error clusters.
- Supabase read-back confirms `memecycle-worker` v11 ACTIVE, `memecycle-monitor` v12 ACTIVE, and `memecycle-revival` v1 ACTIVE.
- Supabase security advisor now reports only the leaked-password-protection warning. Explicit client-deny RLS policies are present on all eight internal research/recovery tables.
- Important: production deployment/build success is not an end-to-end worker test. The database still has no monitor, on-chain investigation, revival assessment, research-job or recovery-case run recorded. The next scheduled executions and first admin-authenticated test remain release verification tasks.

### Scoring calibration follow-up — 2026-11-05
- Tightened the revival scoring model after reviewing sparse-data behavior: viability and risk now remain unmeasured until at least half of their weighted inputs are present; unknown authority is stored as null rather than a zero score.
- Added a regression test for sparse evidence. Combined suite now passes 10/10 tests (6 scoring, 4 recovery policy).
- Redeployed `memecycle-revival` as version 2 ACTIVE.
- Production Vercel environment names confirm `BITQUERY_TOKEN`, `HELIUS_RPC`, `CRON_SECRET`, `SUPABASE_URL` and production-only `SUPABASE_SERVICE_ROLE_KEY` are present. `DEEPSEEK_API_KEY` is not present yet; generative AI dossier creation remains dependent on the user adding that key. No secret values were read into this log.
- No production monitor or revival run is recorded yet. The next scheduled production runs are the first live integration check; verify source errors, RPC compatibility, job persistence and assessment quality before treating the pipeline as operational.

### Authority and consent control hardening — 2026-11-05
- Added explicit human-attestation checkboxes to the private admin identity form. Setting independently verified authority now requires two distinct HTTPS evidence sources plus an affirmative human-review confirmation.
- Recording consent as granted requires independently verified authority, an explicit-project-consent evidence record, and a separate human confirmation.
- Metadata edits preserve existing evidence when the operator leaves the evidence fields blank; changing evidence for an already-verified identity requires renewed confirmation.
- Added two policy tests. Combined scoring and recovery-policy suite now passes 12/12.

### Final production UI release — 2026-11-05
- Deployed the human-attestation hardening and evidence-preservation changes to Vercel production as `dpl_auzHZebmDfTntjDvdpkQaj3xczk2`, commit `9700e8b647b4255ef8607ef72e4dc698710cff60`.
- Production deployment READY; `memecycle.vercel.app` alias read-back confirmed and `aliasError: null`.
- Vercel runtime error scan (last 10 minutes) returned no runtime error clusters.
- The admin UI now requires separate explicit confirmations when recording independently verified authority and granted consent. Changing evidence for an existing verification requires renewed human review; leaving evidence fields blank preserves the previously saved evidence.
- Current test suite: 12/12 pass (6 revival scoring, 6 recovery governance). Vercel build READY. Admin authentication and full browser workflow remain untested because no administrator session was available to the engineering run.


### Live production verification — 2026-11-05 (Europe/Rome)
- Read-only production verification performed against Supabase project `asyswmxkdpidaghrdffa` and Vercel project `memecycle`.
- Supabase project is `ACTIVE_HEALTHY`; Edge Functions are ACTIVE: `memecycle-worker` v11, `memecycle-monitor` v12, `memecycle-community` v1, and `memecycle-revival` v2.
- Production discovery completed at 07:59:43 UTC and finished at 08:00:19 UTC: 124 candidates seen, 30 selected/upserted, 30 snapshots, 30 classifications, zero errors. Sources included DexScreener, GeckoTerminal, Pump.fun launch history and Jupiter.
- Database read-back: 150 tokens, 149 snapshots, zero revival assessments, zero on-chain evidence rows, zero research jobs, zero recovery cases, zero project identities, and zero abandonment assessments.
- No `monitor` or `revival_intelligence` ingestion run is recorded for 2026-11-05. Supabase function logs in the last 24 hours show the discovery worker invocation but no monitor or revival invocation.
- Latest Vercel production deployment `dpl_auzHZebmDfTntjDvdpkQaj3xczk2` is READY on `main`; Vercel runtime error aggregation for the last 24 hours reports no runtime errors.
- Vercel runtime-log inspection for the 24-hour window is unavailable on the current Hobby retention tier. This is an observability limitation, not evidence that no requests occurred.
- No secrets were read, copied or exposed. No production data was mutated and no manual worker invocation was attempted.
- Next gate: inspect the 6 November scheduled executions (discovery 07:00 UTC, monitor 08:00 UTC, revival 10:00 UTC). Confirm a persisted `monitor` and `revival_intelligence` run, successful job/evidence/assessment writes, and source/RPC error details before calling the recovery pipeline operational. If either invocation is still absent, use an authenticated admin/cron execution path after operator authentication; do not bypass CRON_SECRET or service-role checks.


### Revival pipeline root-cause fix and publication gate — 2026-11-05
- Confirmed the deployed revival worker attempted to insert `run_type='revival_intelligence'`, while the production `mc_ingestion_runs_run_type_check` constraint did not allow that value. The worker therefore failed before token selection or RPC work.
- Applied Supabase migration `20261105193834_allow_revival_intelligence_ingestion_runs`; read-back confirms the check constraint now includes `revival_intelligence`.
- Hardened revival queue fairness: assessments use a 90-day cooldown so the first three tokens cannot starve the rest of the archive; failed/partial jobs receive a six-hour retry backoff and at most three attempts; stale running jobs can be reclaimed after 20 minutes; successful and cancelled jobs are not repeated.
- Removed automatic public publication from the monitor. Strong market inactivity evidence may create a private human-review candidate, but the worker now always leaves publication eligibility false and never changes token visibility. Relaunch, outreach, wallet actions and public archive publication remain separately gated.
- Code changes are on branch `agent/memecycle-live-verification-20261105`; production worker redeployment and first end-to-end execution remain pending preview/build verification and a successful authenticated invocation.


### Queue-policy regression coverage and CI — 2026-11-05
- Extracted revival candidate selection and retry policy into `supabase/functions/memecycle-revival/queue-policy.ts`.
- Added Deno tests for unassessed-first fairness, 90-day assessment cooldown, six-hour retry backoff, max-attempt enforcement, stale-lock recovery, and reassessment after cooldown.
- Added GitHub Actions workflow to run the existing Node test suite, Vite production build, Deno type checks for both Edge Functions, and the queue-policy tests.
- A Vercel preview build of the preceding source commit completed successfully; it did not include the final queue-policy test/workflow commit. A fresh preview build is required for the latest branch head.
- CI workflow run status has not yet been returned by the GitHub connector; do not treat tests as passed until a completed run is observed.


### Production deployment and end-to-end verification status — 2026-11-05
- Merged PR #3 to `main` after GitHub Actions passed: 12/12 Node tests, 6/6 Deno queue-policy tests, Deno type checks for monitor and revival, Vite production build, and npm audit with zero reported vulnerabilities.
- Updated direct dependency pins: Vite 6.4.5 and `@vercel/oidc` 4.0.6.
- Applied and verified the production constraint migration allowing `mc_ingestion_runs.run_type='revival_intelligence'`.
- Deployed Supabase Edge Functions: `memecycle-worker` v11 (historical Bitquery source included), `memecycle-monitor` v14 (private-only human-review candidates; allowed event confidence values), and `memecycle-revival` v3 (fair queue, 90-day reassessment cooldown, six-hour retry backoff, three attempts, stale-lock recovery).
- Removed automatic public archive publication from the monitor. The worker cannot change token visibility; publication, outreach and wallet actions remain disabled.
- Confirmed production Vercel deployments are READY. The latest deployment includes a temporary, CRON_SECRET-protected sequential verification route with stage-level logs and a 300-second function limit.
- Archive coverage remains insufficient for a real abandoned-project claim: 150 tokens are present, and none had been first-seen more than 30 days ago at the latest read. The Bitquery archive integration and production token are configured in source/environment, but a successful historical backfill has not yet been recorded.
- The one-time pipeline verification cron is scheduled for 20:00 UTC on 2026-11-05. At the latest database/log check, no discovery, monitor or revival run had yet been recorded for that window. Vercel Hobby cron timing is hourly (the invocation may occur any time from 20:00 through 20:59 UTC); do not mark end-to-end verification complete until database rows and worker logs confirm all stages.
- Supabase security advisor currently reports one warning: leaked-password protection is disabled. No auth policy was changed as part of this milestone.
- No production token was made public, no outreach was sent, and no wallet action or relaunch was performed.


### Historical archive prioritisation — 2026-11-05
- Discovery worker v12 now reserves up to 15 of the 30 daily processed candidates for the Bitquery historical-launch source, then up to 10 PumpData launch-history candidates, with remaining capacity for other discovery sources. This ensures historical records receive market snapshots instead of being left as metadata-only rows.
- Revival worker v4 derives a research priority timestamp from Bitquery launch provenance or PumpData creation metadata, falling back to platform first-seen time. Unassessed historic launches are now investigated before newer tokens that were merely ingested earlier.
- Added a seventh Deno regression test proving that actual historical launch time outranks recent ingestion time.
- Latest verified CI run: 12 application tests passed, 7 Deno queue tests passed, Edge Function type checks passed, production build passed, npm audit reported zero vulnerabilities.
- Supabase Edge Functions are active at worker v12, monitor v14 and revival v4.


### Monitoring fairness and final pre-run checks — 2026-11-05
- Monitor worker v15 now fetches a bounded archive batch, excludes tokens monitored in the preceding seven days when alternatives exist, and orders eligible tokens by actual launch provenance (Bitquery/PumpData) before platform first-seen time. This gives newly backfilled historic launches a fair path to market-pair enrichment without repeatedly selecting the same oldest token.
- CI now type-checks all three Supabase workers (discovery, monitor, revival); the latest run passed. The seven Deno queue tests and application tests/build also passed.
- The one-time production pipeline verification schedule was narrowed to 20:30 UTC on 5 November 2026 only. It will run discovery, then monitor one historical-priority candidate, then investigate one candidate; the temporary route must be removed after verification.
- Current worker versions: discovery v12, monitor v15, revival v4. End-to-end production execution remains unconfirmed until the corresponding ingestion runs, on-chain evidence and revival assessment are read back from Supabase.


### Privacy and row-level security verification — 2026-11-05
- Confirmed RLS is enabled on every `mc_*` table.
- Public token reads are restricted to rows with `visibility='public'`; admins are separately authorised through `app_metadata.role='admin'`.
- On-chain evidence, revival assessments/cases, research jobs, project identities and audit events deny direct anon/authenticated client access.
- Abandonment assessments and reclamation cases are admin-readable; reclamation review updates are admin-only.
- This confirms the discovery and revival evidence remains private until a human admin deliberately publishes an eligible token. No RLS policy was loosened.


### Provider configuration sanity check — 2026-11-05
- Verified the production Bitquery token is present, non-empty and not a placeholder (token value intentionally not recorded).
- Verified the production Helius RPC setting is an HTTPS URL on `mainnet.helius-rpc.com` with an API-key query parameter (credential intentionally not recorded).
- These checks establish configuration shape only; successful provider authentication and historical archive entitlement must be confirmed by the scheduled worker response.


### Pool-aware holder concentration correction — 2026-11-05
- Live revival investigation showed the largest token account's parsed owner was the primary DEX pool address and its balance equalled 100% of mint supply. The prior calculation treated this pool reserve as beneficial-holder concentration.
- Added a pure holder-distribution helper that excludes the explicitly known primary pool address (both account and parsed-owner matches), consolidates remaining accounts by parsed owner, and returns unknown concentration when no non-pool sample or valid supply exists.
- Revival evidence now records excluded pool account count, included non-pool token-account count, invalid account amount count, distinct non-pool owner count, and the limited top-account sample scope.
- Added five Node regression tests for pool exclusion, missing parsed owner, owner aggregation, invalid supply and pool-only samples.
- This change does not claim a full holder census and does not alter publication, outreach, consent or wallet-action controls.


### Pipeline smoke-test completion and temporary route removal — 2026-11-05
- Vercel runtime logs confirm the protected `/api/cron/verify-pipeline` request was sent by `vercel-cron/1.0` with the required secret/configuration present.
- Sequential production smoke test completed: discovery HTTP 200 (partial because Bitquery archive returned 403), monitor HTTP 200 (succeeded, one record checked; no pool-signature RPC was needed for that record), revival HTTP 200 (succeeded, one token investigated, seven evidence records and one assessment written).
- The temporary annual 5 November verification cron and its route are removed from this branch after successful execution, preventing an unintended yearly repeat.
- Historical archive blocker confirmed: Bitquery's documented Solana archive dataset requires an archive add-on; the configured token receives HTTP 403. No paid plan or add-on was purchased. See https://docs.bitquery.io/docs/blockchain/Solana/Pumpfun/Pump-Fun-API/.
- Current candidate archive remains very young: oldest persisted discovery records begin 2 November 2026. This is not enough historical depth to validate actual abandoned-project recovery. Keep this milestone open until a permitted historical source supplies older launches and the monitor/revival workers have processed a representative batch.
- No live public archive record, outreach, relaunch, token transfer, or wallet action was performed.


### Historical source investigation — 2026-11-05
- Confirmed the production Bitquery archive request returned HTTP 403 while the cron runtime confirmed a token is configured. Bitquery documentation says the Solana archive dataset requires an archive add-on; exact cause of this specific 403 remains unconfirmed. No paid plan/add-on was purchased.
- Identified a public Hugging Face dataset, `loopholetape/pumpfun-launches`, under CC BY 4.0, with approximately 2.42 million launch records from 2026-08-31 through 2026-10-29. Its fields include mint, creator and launch time.
- Reviewed its known issues: single-recorder coverage gaps, pre-2026-09-27 decoder undercount, non-random early-feature sampling, and a `rugged` label that is a dataset rule rather than proof of fraud or abandonment.
- Reviewed Hugging Face Dataset Viewer documentation for bounded `/filter` requests (100 rows max) and pagination.
- Source review is documented in `docs/HISTORICAL_ARCHIVE_SOURCE_REVIEW.md`. The dataset is not integrated yet: endpoint access, `partial=false`, pagination and sample chain verification must pass first.


### Monitor queue starvation correction — 2026-11-05
- Found a no-pair branch in monitor v0.3.0 that wrote a market-pair data gap and then continued without inserting an `mc_abandonment_assessments` row.
- The monitor queue excludes recently assessed mints to progress through the archive. Without an assessment row, a no-pair mint remained eligible and could be selected repeatedly, starving later tokens.
- Added a no-pair assessment builder and monitor v0.4.0. It writes an explicit `insufficient_evidence` assessment with null market fields, zero coverage, no risk flags, and publication/auto-publication disabled. It records only the observed DexScreener no-pair response; it does not fabricate pool, holder, or chain activity.
- The monitor now fails the per-token run if this assessment insert fails, rather than silently skipping the queue checkpoint.
- Added two Node regression tests. The combined seven-test holder/no-pair suite passed with Node's built-in test runner.
- This change has not been deployed to production; the existing deployed monitor remains v0.3.0 until reviewed, merged and deployed.


### First live on-chain investigation detail — 2026-11-05
- Investigated mint `C3A64RsYtc1WT5AHGQ7oA7VUDUgCXhvr4u2qA1TcS5wF` using Solana JSON-RPC. The mint account reports 6 decimals and supply `1000000000000000` raw units; mint and freeze authorities are both revoked at observation time.
- The sole largest token account's parsed owner is `BCGxtjq8qmo8LSq4wEeM1jY9m2mcyq4n4eVX9286gPcS`, which is also the recorded primary DEX pool address. Its 100% reserve explains why the previous holder-concentration calculation was invalid; it is not evidence that a person owns 100% of supply.
- One latest-signature lookup on that pool returned 2026-11-02 00:08:11 UTC. The pool was only about 3.88 days old at assessment time, so this is not a dormant-project finding.
- The fee payer from the oldest available initializeMint transaction is a creator candidate, not verified identity. It matched the pumpdata.fun creator field; pumpdata.fun reports 197 earlier launches and zero graduations for that wallet. This is provider-reported creator-history context, not independent proof of ownership or intent.
- The assessment remains `insufficient_evidence`; no recovery case, publication, outreach, or wallet action was created.
- Combined seven-test Node regression suite passed. The new monitor no-pair assessment path is not yet deployed.


### CI verification — 2026-11-05
- GitHub Actions run `MEMECYCLE CI #77` completed successfully on the final PR head.
- Application tests: 19 passed, 0 failed.
- Vite production build: passed.
- Deno checks: discovery worker, monitor function and revival function all passed.
- Revival queue-policy Deno tests: 7 passed, 0 failed.
- The PR remains unmerged and no production deployment was triggered.


### Final read-only production snapshot — 2026-11-05 21:45 UTC
- Database totals after the scheduled smoke test: 180 tokens, 177 snapshots, 1 revival assessment, 7 on-chain evidence records, 1 successful on-chain research job, 0 recovery cases, 0 project identities, and 0 abandonment assessments.
- Persisted discovery window: oldest `first_seen_at` 2026-11-02 16:21:52 UTC; newest 2026-11-05 21:18:33 UTC. The archive is not yet old enough to represent dormant projects.
- The no-pair monitor fix and pool-aware holder calculation remain in PR #4 only; production Edge Functions have not been changed.


### 2026-11-05 — Production fix deployment and reference-first recovery lane
- Deployed the already-reviewed PR #4 Supabase Edge Function changes separately from Vercel: `memecycle-monitor` v16 ACTIVE and `memecycle-revival` v5 ACTIVE; both retain JWT verification.
- Verified the live monitor bundle imports `no-pair-assessment.js` and the live revival bundle imports `holder-distribution.js` and `queue-policy.ts`. The no-pair assessment helper and pool-exclusion helper are therefore present in the active production bundles.
- Added a reference-first archive design: MEMECYCLE stores canonical on-chain identifiers, external dataset row locators, metadata/content URIs, source revisions, content hashes, rights/licence provenance and retrieval status; it does not bulk-copy whole ledgers or media by default.
- Added a read-only rent-recovery estimator to the revival investigator. It reads lamports and data sizes for the mint and the already-sampled largest token accounts, asks Solana RPC for the current rent-exempt minimum for each observed size, and records potential excess and zero-token-balance close candidates as evidence.
- Rent estimates are explicitly non-authoritative: no signer verification, transaction construction, token burning, account closure or SOL transfer. A potential excess withdrawal still depends on the owning Token Program supporting the instruction and the correct authority signing. The sample is not wallet-wide or exhaustive.
- Added three unit tests for rent-floor arithmetic, zero-balance close eligibility separation, and missing rent data. Local Node test result: 3/3 passed.
- The reference-first design and rent estimator are on branch `agent/memecycle-reference-first-rent-recovery-20261105`; not yet merged or deployed. Historical archive source ingestion and an end-to-end production smoke test remain outstanding.

- CI follow-up: the first hosted run correctly caught two fixture strings containing numeric separators and Deno's inferred `never[]` type for the optional JavaScript sample. Fixtures now use raw integer strings, the helper has JSDoc input types, and the bounded sample is explicitly typed at the TypeScript call site. The next hosted run is the release gate; no new estimator code has been deployed.


### 2026-11-05 — Reference-first rent recovery release
- PR #5 merged to `main` as commit `d784665930dfdf21a8c2ca4b26a3568ed3921839` after hosted CI passed: full Node test suite, Vite production build, and Deno checks for discovery, monitor and revival functions.
- Deployed the updated `memecycle-revival` Supabase Edge Function as v6 ACTIVE with JWT verification enabled.
- Verified the live function bundle contains the `rent-recovery.js` helper, calls `getMinimumBalanceForRentExemption`, and records read-only candidate status with transaction construction/submission flags false.
- `memecycle-monitor` remains v16 ACTIVE with the no-pair insufficient-evidence path; `memecycle-revival` v6 includes pool-aware holder scoring and rent-recovery estimates.
- No wallet transaction was built or sent. No account was closed, no tokens burned, and no SOL moved. A runtime invocation of the new rent scan has not yet been verified; the production bundle and CI are verified, while the first scheduled/manual research run remains the runtime verification gate.
- The historical reference-first source strategy is documented. The external archive integration itself is not yet implemented; next work is a bounded source-query pilot with a stable dataset row locator and source revision, then a controlled historical enrichment run.


### 2026-11-05 — External archive locator indexing
- Added `archive-references.js` to generate stable reference pointers for the Solana mint, DexScreener token/pair, oldest available mint-account transaction, and the four exact-mint lookup configurations in the CC BY 4.0 Hugging Face Pump.fun dataset.
- Stored the generated reference object as `archive_references` evidence and inside each revival assessment's evidence manifest. The source rows are not fetched or copied; the manifest marks lookups as reference-only.
- Added tests for exact-mint lookup URL construction, canonical links, and safe handling of IPFS/Arweave/HTTP metadata URI schemes.
- Updated source review: the SolArchive Hugging Face viewer currently reports a Parquet read error and is not eligible for ingestion until a reproducible sample passes validation.
- This locator helper is on branch `agent/memecycle-external-reference-links-20261105`; it is not deployed until CI, merge and Supabase function deployment complete.


### 2026-11-05 — External archive reference index release
- PR #6 merged to `main` as commit `ec5b269d52df85f5313ae0227552092b514a2b7f` after hosted CI passed: full Node test suite, Vite production build and Deno checks for discovery, monitor and revival.
- Deployed `memecycle-revival` as Supabase Edge Function v7 ACTIVE with JWT verification enabled.
- Verified the live bundle contains the reference helper, exact-mint Hugging Face Dataset Viewer filter links for all four configurations, the `reference_only_not_fetched` status, rent estimator, and pool-aware holder aggregation.
- The links are persisted as `archive_references` evidence and inside the revival evidence manifest. They point to the external dataset and canonical Solana/DEX records; no dataset rows or media are copied. The HF source has not yet been queried from production, so row-match and revision validation remain a separate pilot.
- No Vercel deployment was needed for this backend-only change; no public frontend behavior changed. No wallet transactions, closures, burns or SOL transfers were performed.
